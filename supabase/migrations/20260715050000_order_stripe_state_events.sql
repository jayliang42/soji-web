alter table public.subscriptions
add column if not exists status_observed_at timestamptz;

update public.subscriptions
set status_observed_at = created_at
where status_observed_at is null;

alter table public.subscriptions
alter column status_observed_at set default now();
alter table public.subscriptions
alter column status_observed_at set not null;

create or replace function public.sync_stripe_subscription_state(
  p_user_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_plan_id membership_tier,
  p_status text,
  p_current_period_ends_at timestamptz default null,
  p_cancelled_at timestamptz default null,
  p_observed_at timestamptz default clock_timestamp(),
  p_cancel_at_period_end boolean default false
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
  effective_plan_id membership_tier;
  effective_status text;
  effective_period_ends_at timestamptz;
  effective_observed_at timestamptz;
  existing_user_id uuid;
begin
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select subscription.user_id
  into existing_user_id
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

  if existing_user_id is not null and existing_user_id <> p_user_id then
    raise exception 'subscription_ownership_conflict' using errcode = '23505';
  end if;

  insert into public.subscriptions (
    user_id,
    provider,
    provider_customer_id,
    provider_subscription_id,
    plan_id,
    status,
    current_period_ends_at,
    cancelled_at,
    cancel_at_period_end,
    status_observed_at
  ) values (
    p_user_id,
    'stripe'::billing_provider,
    p_provider_customer_id,
    p_provider_subscription_id,
    p_plan_id,
    p_status,
    p_current_period_ends_at,
    p_cancelled_at,
    p_cancel_at_period_end,
    p_observed_at
  )
  on conflict (provider_subscription_id) do update
  set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_ends_at = excluded.current_period_ends_at,
    cancelled_at = excluded.cancelled_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    status_observed_at = excluded.status_observed_at
  where excluded.status_observed_at >= subscriptions.status_observed_at
    and not (
      subscriptions.status in ('canceled', 'incomplete_expired')
      and excluded.status not in ('canceled', 'incomplete_expired')
    );

  select subscription.plan_id, subscription.status,
    subscription.current_period_ends_at, subscription.status_observed_at
  into effective_plan_id, effective_status, effective_period_ends_at,
    effective_observed_at
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

  update public.user_entitlements
  set ends_at = effective_observed_at
  where user_id = p_user_id
    and source_type = 'subscription'
    and source_id = p_provider_subscription_id;

  if effective_status in ('active', 'trialing') then
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
      'subscription',
      p_provider_subscription_id,
      effective_observed_at,
      effective_period_ends_at
    from public.plan_entitlements as plan_entitlement
    where plan_entitlement.plan_id = effective_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = excluded.ends_at;
  end if;

  select case coalesce(max(
    case subscription.plan_id
      when 'tier_3'::membership_tier then 3
      when 'tier_2'::membership_tier then 2
      when 'tier_1'::membership_tier then 1
      else 0
    end
  ), 0)
    when 3 then 'tier_3'::membership_tier
    when 2 then 'tier_2'::membership_tier
    when 1 then 'tier_1'::membership_tier
    else 'free'::membership_tier
  end
  into effective_tier
  from public.subscriptions as subscription
  where subscription.user_id = p_user_id
    and subscription.status in ('active', 'trialing');

  update public.profiles
  set tier = effective_tier
  where id = p_user_id;

  return effective_tier;
end;
$$;

create or replace function public.sync_stripe_product_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_provider_payment_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  product_entitlement_id text;
  existing_user_id uuid;
  existing_product_id uuid;
  effective_status text;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('paid', 'no_payment_required') then
    raise exception 'purchase_payment_not_complete' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select product.entitlement_id
  into product_entitlement_id
  from public.products as product
  where product.id = p_product_id;

  if product_entitlement_id is null then
    raise exception 'product_entitlement_not_configured' using errcode = '23514';
  end if;

  select purchase.user_id, purchase.product_id
  into existing_user_id, existing_product_id
  from public.purchases as purchase
  where purchase.provider_payment_id = p_provider_payment_id
  for update;

  if existing_user_id is not null
    and (existing_user_id <> p_user_id or existing_product_id <> p_product_id)
  then
    raise exception 'payment_ownership_conflict' using errcode = '23505';
  end if;

  insert into public.purchases (
    user_id,
    product_id,
    provider,
    provider_payment_id,
    status,
    status_observed_at
  ) values (
    p_user_id,
    p_product_id,
    'stripe'::billing_provider,
    p_provider_payment_id,
    p_status,
    p_observed_at
  )
  on conflict (provider_payment_id) do update
  set
    status = excluded.status,
    status_observed_at = excluded.status_observed_at
  where purchases.status <> 'refunded'
    and excluded.status_observed_at >= purchases.status_observed_at;

  select purchase.status
  into effective_status
  from public.purchases as purchase
  where purchase.provider_payment_id = p_provider_payment_id;

  if effective_status in ('paid', 'no_payment_required', 'partially_refunded') then
    insert into public.user_entitlements (
      user_id,
      entitlement_id,
      source_type,
      source_id,
      starts_at,
      ends_at
    ) values (
      p_user_id,
      product_entitlement_id,
      'purchase',
      p_provider_payment_id,
      p_observed_at,
      null
    )
    on conflict (user_id, entitlement_id, source_type, source_id) do nothing;
  else
    delete from public.user_entitlements
    where user_id = p_user_id
      and entitlement_id = product_entitlement_id
      and source_type = 'purchase'
      and source_id = p_provider_payment_id;
  end if;

  return product_entitlement_id;
end;
$$;

create or replace function public.sync_stripe_product_refund(
  p_provider_payment_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  purchase_user_id uuid;
  purchase_product_id uuid;
  purchase_entitlement_id text;
  current_status text;
  current_observed_at timestamptz;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('partially_refunded', 'refunded') then
    raise exception 'invalid_purchase_refund_status' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select purchase.user_id, purchase.product_id, product.entitlement_id,
    purchase.status, purchase.status_observed_at
  into purchase_user_id, purchase_product_id, purchase_entitlement_id,
    current_status, current_observed_at
  from public.purchases as purchase
  join public.products as product on product.id = purchase.product_id
  where purchase.provider = 'stripe'::billing_provider
    and purchase.provider_payment_id = p_provider_payment_id
  for update of purchase;

  if purchase_user_id is null then
    raise exception 'purchase_not_found' using errcode = 'P0002';
  end if;

  if current_status = 'refunded'
    or p_observed_at < current_observed_at
    or (p_observed_at = current_observed_at and p_status = 'partially_refunded')
  then
    return current_status;
  end if;

  update public.purchases as purchase
  set
    status = p_status,
    status_observed_at = p_observed_at
  where purchase.provider_payment_id = p_provider_payment_id;

  if p_status = 'refunded' then
    delete from public.user_entitlements
    where user_id = purchase_user_id
      and entitlement_id = purchase_entitlement_id
      and source_type = 'purchase'
      and source_id = p_provider_payment_id;

    delete from public.product_checkout_intents
    where user_id = purchase_user_id
      and product_id = purchase_product_id;
  end if;

  return p_status;
end;
$$;

revoke all on function public.sync_stripe_subscription_state(
  uuid, text, text, membership_tier, text,
  timestamptz, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription_state(
  uuid, text, text, membership_tier, text,
  timestamptz, timestamptz, timestamptz, boolean
) to service_role;
revoke all on function public.sync_stripe_product_purchase(
  uuid, uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_purchase(
  uuid, uuid, text, text, timestamptz
) to service_role;
revoke all on function public.sync_stripe_product_refund(
  text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_refund(
  text, text, timestamptz
) to service_role;
