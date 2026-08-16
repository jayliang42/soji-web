begin;

alter table public.membership_purchases
  add column if not exists dispute_observed_at timestamptz;

update public.membership_purchases
set dispute_observed_at = status_observed_at
where dispute_id is not null
  and dispute_status is not null
  and dispute_observed_at is null;

alter table public.membership_purchases
  drop constraint if exists membership_purchases_status_check;

alter table public.membership_purchases
  add constraint membership_purchases_status_check
  check (status in ('paid', 'no_payment_required', 'partially_refunded', 'refunded'));

alter table public.membership_purchases
  drop constraint if exists membership_purchases_dispute_state_check;

alter table public.membership_purchases
  add constraint membership_purchases_dispute_state_check check (
    (
      dispute_id is null
      and dispute_status is null
      and dispute_observed_at is null
    )
    or (
      coalesce(dispute_id <> '', false)
      and dispute_status in (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'won',
        'lost',
        'prevented'
      )
      and dispute_observed_at is not null
    )
  );

create or replace function public.claim_subscription_checkout(p_request_id uuid)
returns table (
  outcome text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_time timestamptz := clock_timestamp();
  claim_duration constant interval := interval '35 minutes';
  claim_expires_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.subscription-checkout:' || current_user_id::text, 0)
  );

  if exists (
    select 1
    from public.user_entitlements entitlement
    where entitlement.user_id = current_user_id
      and entitlement.entitlement_id = 'content.all'
      and (
        entitlement.ends_at is null
        or entitlement.ends_at > request_time
      )
  ) or exists (
    select 1
    from public.membership_purchases purchase
    where purchase.user_id = current_user_id
      and purchase.status in ('paid', 'no_payment_required', 'partially_refunded')
  ) or exists (
    select 1
    from public.subscriptions subscription
    where subscription.user_id = current_user_id
      and subscription.provider = 'stripe'::public.billing_provider
      and subscription.status in (
        'active',
        'trialing',
        'incomplete',
        'past_due',
        'unpaid',
        'paused'
      )
  ) then
    return query select 'existing_subscription'::text, null::timestamptz;
    return;
  end if;

  insert into public.subscription_checkout_intents (
    user_id,
    request_id,
    expires_at,
    created_at,
    updated_at
  )
  values (
    current_user_id,
    p_request_id,
    request_time + claim_duration,
    request_time,
    request_time
  )
  on conflict (user_id) do update
  set
    request_id = excluded.request_id,
    expires_at = case
      when subscription_checkout_intents.request_id = excluded.request_id
        then subscription_checkout_intents.expires_at
      else excluded.expires_at
    end,
    created_at = case
      when subscription_checkout_intents.request_id = excluded.request_id
        then subscription_checkout_intents.created_at
      else excluded.created_at
    end,
    updated_at = excluded.updated_at
  where subscription_checkout_intents.expires_at <= request_time
    or subscription_checkout_intents.request_id = excluded.request_id
  returning subscription_checkout_intents.expires_at into claim_expires_at;

  if not found then
    select intent.expires_at
    into claim_expires_at
    from public.subscription_checkout_intents intent
    where intent.user_id = current_user_id;

    return query select 'checkout_in_progress'::text, claim_expires_at;
    return;
  end if;

  return query select 'claimed'::text, claim_expires_at;
end;
$$;

create or replace function public.sync_stripe_membership_purchase(
  p_user_id uuid,
  p_plan_id membership_tier,
  p_provider_payment_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_user_id uuid;
  existing_plan_id membership_tier;
  effective_status text;
  effective_dispute_status text;
  effective_observed_at timestamptz;
begin
  if p_user_id is null or p_plan_id = 'free'::membership_tier then
    raise exception 'membership_purchase_identity_invalid' using errcode = '22023';
  end if;
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('paid', 'no_payment_required') then
    raise exception 'membership_payment_not_complete' using errcode = '23514';
  end if;
  if p_observed_at is null then
    raise exception 'membership_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('soji.subscription-checkout:' || p_user_id::text, 0)
  );

  select purchase.user_id, purchase.plan_id
  into existing_user_id, existing_plan_id
  from public.membership_purchases purchase
  where purchase.provider_payment_id = p_provider_payment_id
  for update;

  if existing_user_id is not null
    and (existing_user_id <> p_user_id or existing_plan_id <> p_plan_id)
  then
    raise exception 'payment_ownership_conflict' using errcode = '23505';
  end if;

  insert into public.membership_purchases (
    user_id,
    plan_id,
    provider,
    provider_payment_id,
    status,
    status_observed_at
  ) values (
    p_user_id,
    p_plan_id,
    'stripe'::billing_provider,
    p_provider_payment_id,
    p_status,
    p_observed_at
  )
  on conflict (provider_payment_id) do update
  set
    status = excluded.status,
    status_observed_at = excluded.status_observed_at
  where membership_purchases.status in ('paid', 'no_payment_required')
    and excluded.status_observed_at >= membership_purchases.status_observed_at;

  select purchase.status, purchase.dispute_status, purchase.status_observed_at
  into effective_status, effective_dispute_status, effective_observed_at
  from public.membership_purchases purchase
  where purchase.provider_payment_id = p_provider_payment_id;

  if effective_status in ('paid', 'no_payment_required', 'partially_refunded')
    and coalesce(
      effective_dispute_status not in (
        'warning_needs_response',
        'warning_under_review',
        'needs_response',
        'under_review',
        'lost'
      ),
      true
    )
  then
    insert into public.user_entitlements (
      user_id,
      entitlement_id,
      source_type,
      source_id,
      starts_at,
      ends_at
    )
    select
      p_user_id,
      plan_entitlement.entitlement_id,
      'membership_purchase',
      p_provider_payment_id,
      effective_observed_at,
      null
    from public.plan_entitlements plan_entitlement
    where plan_entitlement.plan_id = p_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = null;
  else
    delete from public.user_entitlements
    where user_id = p_user_id
      and source_type = 'membership_purchase'
      and source_id = p_provider_payment_id;
  end if;

  delete from public.subscription_checkout_intents
  where user_id = p_user_id;

  return public.recompute_full_access_profile(p_user_id);
end;
$$;

create or replace function public.sync_stripe_membership_refund(
  p_provider_payment_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  purchase_user_id uuid;
  current_status text;
  current_observed_at timestamptz;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('partially_refunded', 'refunded') then
    raise exception 'membership_refund_status_invalid' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'membership_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select purchase.user_id, purchase.status, purchase.status_observed_at
  into purchase_user_id, current_status, current_observed_at
  from public.membership_purchases purchase
  where purchase.provider = 'stripe'::billing_provider
    and purchase.provider_payment_id = p_provider_payment_id
  for update;

  if purchase_user_id is null then
    raise exception 'membership_purchase_not_found' using errcode = 'P0002';
  end if;

  if current_status = 'refunded'
    or p_observed_at < current_observed_at
    or (p_observed_at = current_observed_at and p_status = 'partially_refunded')
  then
    return public.recompute_full_access_profile(purchase_user_id);
  end if;

  update public.membership_purchases purchase
  set
    status = p_status,
    status_observed_at = p_observed_at
  where purchase.provider_payment_id = p_provider_payment_id;

  if p_status = 'refunded' then
    delete from public.user_entitlements
    where user_id = purchase_user_id
      and source_type = 'membership_purchase'
      and source_id = p_provider_payment_id;

    delete from public.subscription_checkout_intents
    where user_id = purchase_user_id;
  end if;

  return public.recompute_full_access_profile(purchase_user_id);
end;
$$;

create or replace function public.sync_stripe_membership_dispute(
  p_provider_payment_id text,
  p_provider_dispute_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  purchase_user_id uuid;
  purchase_plan_id membership_tier;
  purchase_status text;
  current_dispute_id text;
  current_dispute_status text;
  current_observed_at timestamptz;
  current_rank integer;
  incoming_rank integer;
  blocks_access boolean;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_provider_dispute_id is null or btrim(p_provider_dispute_id) = '' then
    raise exception 'provider_dispute_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in (
    'warning_needs_response',
    'warning_under_review',
    'warning_closed',
    'needs_response',
    'under_review',
    'won',
    'lost',
    'prevented'
  ) then
    raise exception 'membership_dispute_status_invalid' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'membership_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select
    purchase.user_id,
    purchase.plan_id,
    purchase.status,
    purchase.dispute_id,
    purchase.dispute_status,
    purchase.dispute_observed_at
  into
    purchase_user_id,
    purchase_plan_id,
    purchase_status,
    current_dispute_id,
    current_dispute_status,
    current_observed_at
  from public.membership_purchases purchase
  where purchase.provider = 'stripe'::billing_provider
    and purchase.provider_payment_id = p_provider_payment_id
  for update;

  if purchase_user_id is null then
    raise exception 'membership_purchase_not_found' using errcode = 'P0002';
  end if;

  current_rank := case current_dispute_status
    when 'won' then 4
    when 'warning_closed' then 3
    when 'prevented' then 3
    when 'lost' then 2
    when 'warning_needs_response' then 1
    when 'warning_under_review' then 1
    when 'needs_response' then 1
    when 'under_review' then 1
    else 0
  end;
  incoming_rank := case p_status
    when 'won' then 4
    when 'warning_closed' then 3
    when 'prevented' then 3
    when 'lost' then 2
    else 1
  end;

  if current_observed_at is not null and (
    p_observed_at < current_observed_at
    or (
      p_observed_at = current_observed_at
      and (
        (
          p_provider_dispute_id = current_dispute_id
          and incoming_rank <= current_rank
        )
        or (
          p_provider_dispute_id <> current_dispute_id
          and p_provider_dispute_id <= current_dispute_id
        )
      )
    )
  ) then
    return public.recompute_full_access_profile(purchase_user_id);
  end if;

  update public.membership_purchases purchase
  set
    dispute_id = p_provider_dispute_id,
    dispute_status = p_status,
    dispute_observed_at = p_observed_at
  where purchase.provider_payment_id = p_provider_payment_id;

  blocks_access := p_status in (
    'warning_needs_response',
    'warning_under_review',
    'needs_response',
    'under_review',
    'lost'
  );

  if blocks_access or purchase_status = 'refunded' then
    delete from public.user_entitlements
    where user_id = purchase_user_id
      and source_type = 'membership_purchase'
      and source_id = p_provider_payment_id;
  elsif purchase_status in ('paid', 'no_payment_required', 'partially_refunded') then
    insert into public.user_entitlements (
      user_id,
      entitlement_id,
      source_type,
      source_id,
      starts_at,
      ends_at
    )
    select
      purchase_user_id,
      plan_entitlement.entitlement_id,
      'membership_purchase',
      p_provider_payment_id,
      p_observed_at,
      null
    from public.plan_entitlements plan_entitlement
    where plan_entitlement.plan_id = purchase_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = null;
  end if;

  return public.recompute_full_access_profile(purchase_user_id);
end;
$$;

create or replace function public.release_subscription_checkout()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.subscription_checkout_intents
  where user_id = current_user_id;

  return found;
end;
$$;

revoke all on function public.claim_subscription_checkout(uuid)
from public;
grant execute on function public.claim_subscription_checkout(uuid)
to authenticated, service_role;

revoke all on function public.release_subscription_checkout()
from public;
grant execute on function public.release_subscription_checkout()
to authenticated, service_role;

revoke all on function public.recompute_full_access_profile(uuid)
from public, anon, authenticated;
revoke all on function public.sync_stripe_membership_purchase(
  uuid, membership_tier, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.sync_stripe_membership_refund(
  text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.sync_stripe_membership_dispute(
  text, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.sync_stripe_membership_purchase(
  uuid, membership_tier, text, text, timestamptz
) to service_role;
grant execute on function public.sync_stripe_membership_refund(
  text, text, timestamptz
) to service_role;
grant execute on function public.sync_stripe_membership_dispute(
  text, text, text, timestamptz
) to service_role;

commit;
