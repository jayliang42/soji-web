create table if not exists public.subscription_billing_adjustments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.subscriptions (id) on delete cascade,
  provider billing_provider not null default 'stripe',
  provider_payment_id text not null,
  provider_adjustment_id text not null,
  kind text not null,
  status text not null,
  amount integer not null,
  currency text not null,
  blocks_access boolean not null,
  observed_at timestamptz not null,
  superseded_by_provider_payment_id text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_billing_adjustments_provider_identity_key
    unique (provider, kind, provider_adjustment_id),
  constraint subscription_billing_adjustments_provider_ids_check check (
    provider_payment_id = btrim(provider_payment_id)
    and provider_payment_id <> ''
    and length(provider_payment_id) <= 255
    and provider_adjustment_id = btrim(provider_adjustment_id)
    and provider_adjustment_id <> ''
    and length(provider_adjustment_id) <= 255
  ),
  constraint subscription_billing_adjustments_kind_status_check check (
    (
      kind = 'refund'
      and status in ('partially_refunded', 'refunded')
      and blocks_access = (status = 'refunded')
    )
    or (
      kind = 'dispute'
      and status in (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'won',
        'lost',
        'prevented'
      )
      and blocks_access = (
        status in (
          'warning_needs_response',
          'warning_under_review',
          'needs_response',
          'under_review',
          'lost'
        )
      )
    )
  ),
  constraint subscription_billing_adjustments_amount_currency_check check (
    amount >= 0
    and currency = lower(btrim(currency))
    and currency ~ '^[a-z]{3}$'
  ),
  constraint subscription_billing_adjustments_supersession_check check (
    (
      superseded_by_provider_payment_id is null
      and superseded_at is null
    )
    or (
      kind = 'refund'
      and status = 'refunded'
      and blocks_access
      and superseded_by_provider_payment_id is not null
      and superseded_by_provider_payment_id =
        btrim(superseded_by_provider_payment_id)
      and superseded_by_provider_payment_id <> ''
      and length(superseded_by_provider_payment_id) <= 255
      and superseded_by_provider_payment_id <> provider_payment_id
      and superseded_at > observed_at
    )
  )
);

alter table public.subscriptions
add column if not exists latest_paid_provider_payment_id text;

alter table public.subscriptions
add column if not exists latest_paid_observed_at timestamptz;

alter table public.subscriptions
add column if not exists provider_synced_at timestamptz not null default now();

alter table public.subscriptions
add column if not exists reconciliation_closed_at timestamptz;

alter table public.subscriptions
drop constraint if exists subscriptions_latest_paid_payment_check;

alter table public.subscriptions
add constraint subscriptions_latest_paid_payment_check check (
  (
    latest_paid_provider_payment_id is null
    and latest_paid_observed_at is null
  )
  or (
    latest_paid_provider_payment_id is not null
    and latest_paid_provider_payment_id =
      btrim(latest_paid_provider_payment_id)
    and latest_paid_provider_payment_id <> ''
    and length(latest_paid_provider_payment_id) <= 255
    and latest_paid_observed_at is not null
  )
);

alter table public.subscriptions
drop constraint if exists subscriptions_reconciliation_closure_check;

alter table public.subscriptions
add constraint subscriptions_reconciliation_closure_check check (
  reconciliation_closed_at is null
  or status = 'canceled'
);

create index if not exists
subscription_billing_adjustments_subscription_observed_idx
on public.subscription_billing_adjustments (
  subscription_id,
  observed_at desc,
  provider_adjustment_id desc
);

create index if not exists
subscription_billing_adjustments_active_blocks_idx
on public.subscription_billing_adjustments (subscription_id)
where blocks_access and superseded_at is null;

alter table public.billing_events
drop constraint if exists billing_events_stripe_payload_minimized;
alter table public.billing_events
add constraint billing_events_stripe_payload_minimized check (
  provider <> 'stripe'
  or event_type = 'admin.billing.reconcile'
  or (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'id' = provider_event_id
    and payload ->> 'type' = event_type
    and payload - array[
      'apiVersion',
      'chargeId',
      'created',
      'customerId',
      'disputeId',
      'id',
      'livemode',
      'objectId',
      'objectType',
      'paymentId',
      'subscriptionId',
      'type'
    ] = '{}'::jsonb
    and (
      not payload ? 'chargeId'
      or (
        jsonb_typeof(payload -> 'chargeId') = 'string'
        and length(payload ->> 'chargeId') between 1 and 255
      )
    )
    and (
      not payload ? 'customerId'
      or (
        jsonb_typeof(payload -> 'customerId') = 'string'
        and length(payload ->> 'customerId') between 1 and 255
      )
    )
    and (
      not payload ? 'disputeId'
      or (
        jsonb_typeof(payload -> 'disputeId') = 'string'
        and length(payload ->> 'disputeId') between 1 and 255
      )
    )
    and (
      not payload ? 'paymentId'
      or (
        jsonb_typeof(payload -> 'paymentId') = 'string'
        and length(payload ->> 'paymentId') between 1 and 255
      )
    )
    and (
      not payload ? 'subscriptionId'
      or (
        jsonb_typeof(payload -> 'subscriptionId') = 'string'
        and length(payload ->> 'subscriptionId') between 1 and 255
      )
    )
  )
);

create or replace function public.recompute_stripe_subscription_access(
  p_subscription_id uuid,
  p_effective_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
  subscription_period_ends_at timestamptz;
  subscription_plan_id membership_tier;
  subscription_provider_id text;
  subscription_status text;
  subscription_user_id uuid;
begin
  if p_subscription_id is null then
    raise exception 'subscription_id_required' using errcode = '22023';
  end if;
  if p_effective_observed_at is null then
    raise exception 'effective_observed_at_required' using errcode = '22023';
  end if;

  select
    subscription.user_id,
    subscription.provider_subscription_id,
    subscription.plan_id,
    subscription.status,
    subscription.current_period_ends_at
  into
    subscription_user_id,
    subscription_provider_id,
    subscription_plan_id,
    subscription_status,
    subscription_period_ends_at
  from public.subscriptions as subscription
  where subscription.id = p_subscription_id
  for update;

  if subscription_user_id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  update public.user_entitlements
  set ends_at = p_effective_observed_at
  where user_id = subscription_user_id
    and source_type = 'subscription'
    and source_id = subscription_provider_id;

  if subscription_status in ('active', 'trialing')
    and not exists (
      select 1
      from public.subscription_billing_adjustments as adjustment
      where adjustment.subscription_id = p_subscription_id
        and adjustment.blocks_access
        and adjustment.superseded_at is null
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
      subscription_user_id,
      plan_entitlement.entitlement_id,
      'subscription',
      subscription_provider_id,
      p_effective_observed_at,
      subscription_period_ends_at
    from public.plan_entitlements as plan_entitlement
    where plan_entitlement.plan_id = subscription_plan_id
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
  where subscription.user_id = subscription_user_id
    and subscription.status in ('active', 'trialing')
    and not exists (
      select 1
      from public.subscription_billing_adjustments as adjustment
      where adjustment.subscription_id = subscription.id
        and adjustment.blocks_access
        and adjustment.superseded_at is null
    );

  update public.profiles
  set tier = effective_tier
  where id = subscription_user_id;

  return effective_tier;
end;
$$;

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
  effective_observed_at timestamptz;
  existing_user_id uuid;
  saved_subscription_id uuid;
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
    provider_synced_at,
    reconciliation_closed_at,
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
    clock_timestamp(),
    null,
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
    provider_synced_at = clock_timestamp(),
    reconciliation_closed_at = null,
    status_observed_at = excluded.status_observed_at
  where (
      excluded.status_observed_at >= subscriptions.status_observed_at
      or subscriptions.reconciliation_closed_at is not null
    )
    and not (
      subscriptions.status in ('canceled', 'incomplete_expired')
      and excluded.status not in ('canceled', 'incomplete_expired')
      and subscriptions.reconciliation_closed_at is null
    );

  select subscription.id, subscription.status_observed_at
  into saved_subscription_id, effective_observed_at
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

  return public.recompute_stripe_subscription_access(
    saved_subscription_id,
    effective_observed_at
  );
end;
$$;

create or replace function public.close_missing_stripe_customer_subscriptions(
  p_provider_customer_id text,
  p_remote_subscription_ids text[],
  p_reconciliation_started_at timestamptz
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  closed_count integer := 0;
  closed_subscription record;
  subscription_user_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_provider_customer_id is null
    or btrim(p_provider_customer_id) = ''
    or length(btrim(p_provider_customer_id)) > 255
  then
    raise exception 'provider_customer_id_required' using errcode = '22023';
  end if;
  if p_remote_subscription_ids is null
    or exists (
      select 1
      from unnest(p_remote_subscription_ids) as remote_id
      where remote_id is null
        or remote_id <> btrim(remote_id)
        or remote_id = ''
        or length(remote_id) > 255
    )
  then
    raise exception 'remote_subscription_ids_invalid' using errcode = '22023';
  end if;
  if p_reconciliation_started_at is null then
    raise exception 'reconciliation_started_at_required'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-customer:' || p_provider_customer_id,
      0
    )
  );

  for subscription_user_id in
    select distinct subscription.user_id
    from public.subscriptions as subscription
    where subscription.provider = 'stripe'::billing_provider
      and subscription.provider_customer_id = p_provider_customer_id
      and not (
        subscription.provider_subscription_id =
          any(p_remote_subscription_ids)
      )
      and subscription.status not in ('canceled', 'incomplete_expired')
      and subscription.created_at <= p_reconciliation_started_at
      and subscription.provider_synced_at <=
        p_reconciliation_started_at
    order by subscription.user_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(subscription_user_id::text, 0)
    );
  end loop;

  for closed_subscription in
    update public.subscriptions as subscription
    set
      status = 'canceled',
      cancelled_at = coalesce(
        subscription.cancelled_at,
        p_reconciliation_started_at
      ),
      cancel_at_period_end = false,
      reconciliation_closed_at = p_reconciliation_started_at,
      status_observed_at = greatest(
        subscription.status_observed_at,
        p_reconciliation_started_at
      )
    where subscription.provider = 'stripe'::billing_provider
      and subscription.provider_customer_id = p_provider_customer_id
      and not (
        subscription.provider_subscription_id =
          any(p_remote_subscription_ids)
      )
      and subscription.status not in ('canceled', 'incomplete_expired')
      and subscription.created_at <= p_reconciliation_started_at
      and subscription.provider_synced_at <=
        p_reconciliation_started_at
    returning subscription.id, subscription.status_observed_at
  loop
    perform public.recompute_stripe_subscription_access(
      closed_subscription.id,
      closed_subscription.status_observed_at
    );
    closed_count := closed_count + 1;
  end loop;

  return closed_count;
end;
$$;

create or replace function public.sync_stripe_subscription_adjustment(
  p_provider_subscription_id text,
  p_provider_payment_id text,
  p_provider_adjustment_id text,
  p_kind text,
  p_status text,
  p_amount integer,
  p_currency text,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  adjustment_blocks_access boolean;
  current_observed_at timestamptz;
  current_rank integer;
  current_status text;
  existing_payment_id text;
  existing_subscription_id uuid;
  incoming_rank integer;
  latest_paid_observed_at timestamptz;
  latest_paid_provider_payment_id text;
  subscription_user_id uuid;
  target_subscription_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
    or length(btrim(p_provider_subscription_id)) > 255
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;
  if p_provider_payment_id is null
    or btrim(p_provider_payment_id) = ''
    or length(btrim(p_provider_payment_id)) > 255
  then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_provider_adjustment_id is null
    or btrim(p_provider_adjustment_id) = ''
    or length(btrim(p_provider_adjustment_id)) > 255
  then
    raise exception 'provider_adjustment_id_required' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'invalid_adjustment_amount' using errcode = '22023';
  end if;
  if p_currency is null or p_currency !~ '^[a-z]{3}$' then
    raise exception 'invalid_adjustment_currency' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'adjustment_observed_at_required' using errcode = '22023';
  end if;
  if not (
    (p_kind = 'refund' and p_status in ('partially_refunded', 'refunded'))
    or (
      p_kind = 'dispute'
      and p_status in (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'won',
        'lost',
        'prevented'
      )
    )
  ) then
    raise exception 'invalid_subscription_adjustment_state'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );
  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-adjustment:' || p_kind || ':' || p_provider_adjustment_id,
      0
    )
  );

  select
    subscription.id,
    subscription.user_id,
    subscription.latest_paid_provider_payment_id,
    subscription.latest_paid_observed_at
  into
    target_subscription_id,
    subscription_user_id,
    latest_paid_provider_payment_id,
    latest_paid_observed_at
  from public.subscriptions as subscription
  where subscription.provider = 'stripe'::billing_provider
    and subscription.provider_subscription_id = p_provider_subscription_id;

  if target_subscription_id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(subscription_user_id::text, 0));

  select
    adjustment.subscription_id,
    adjustment.provider_payment_id,
    adjustment.status,
    adjustment.observed_at
  into
    existing_subscription_id,
    existing_payment_id,
    current_status,
    current_observed_at
  from public.subscription_billing_adjustments as adjustment
  where adjustment.provider = 'stripe'::billing_provider
    and adjustment.kind = p_kind
    and adjustment.provider_adjustment_id = p_provider_adjustment_id
  for update;

  if existing_subscription_id is not null
    and (
      existing_subscription_id <> target_subscription_id
      or existing_payment_id <> p_provider_payment_id
    )
  then
    raise exception 'adjustment_ownership_conflict' using errcode = '23505';
  end if;

  current_rank := case current_status
    when 'partially_refunded' then 1
    when 'refunded' then 2
    when 'warning_needs_response' then 1
    when 'warning_under_review' then 1
    when 'needs_response' then 1
    when 'under_review' then 1
    when 'warning_closed' then 2
    when 'won' then 2
    when 'prevented' then 2
    when 'lost' then 3
    else 0
  end;
  incoming_rank := case p_status
    when 'partially_refunded' then 1
    when 'refunded' then 2
    when 'warning_needs_response' then 1
    when 'warning_under_review' then 1
    when 'needs_response' then 1
    when 'under_review' then 1
    when 'warning_closed' then 2
    when 'won' then 2
    when 'prevented' then 2
    when 'lost' then 3
  end;

  if current_observed_at is not null
    and (
      current_status in ('refunded', 'lost')
      or p_observed_at < current_observed_at
      or (
        p_observed_at = current_observed_at
        and incoming_rank <= current_rank
      )
    )
  then
    return current_status;
  end if;

  adjustment_blocks_access := (
    p_status = 'refunded'
    or p_status in (
      'warning_needs_response',
      'warning_under_review',
      'needs_response',
      'under_review',
      'lost'
    )
  );

  if existing_subscription_id is null then
    insert into public.subscription_billing_adjustments (
      subscription_id,
      provider,
      provider_payment_id,
      provider_adjustment_id,
      kind,
      status,
      amount,
      currency,
      blocks_access,
      observed_at
    ) values (
      target_subscription_id,
      'stripe'::billing_provider,
      p_provider_payment_id,
      p_provider_adjustment_id,
      p_kind,
      p_status,
      p_amount,
      p_currency,
      adjustment_blocks_access,
      p_observed_at
    );
  else
    update public.subscription_billing_adjustments as adjustment
    set
      status = p_status,
      amount = p_amount,
      currency = p_currency,
      blocks_access = adjustment_blocks_access,
      observed_at = p_observed_at,
      updated_at = clock_timestamp()
    where adjustment.provider = 'stripe'::billing_provider
      and adjustment.kind = p_kind
      and adjustment.provider_adjustment_id = p_provider_adjustment_id;
  end if;

  if p_kind = 'refund'
    and p_status = 'refunded'
    and latest_paid_observed_at > p_observed_at
    and latest_paid_provider_payment_id <> p_provider_payment_id
  then
    update public.subscription_billing_adjustments as adjustment
    set
      superseded_by_provider_payment_id =
        latest_paid_provider_payment_id,
      superseded_at = latest_paid_observed_at,
      updated_at = clock_timestamp()
    where adjustment.subscription_id = target_subscription_id
      and adjustment.provider = 'stripe'::billing_provider
      and adjustment.kind = 'refund'
      and adjustment.provider_adjustment_id = p_provider_adjustment_id
      and adjustment.status = 'refunded'
      and adjustment.superseded_at is null;
  end if;

  perform public.recompute_stripe_subscription_access(
    target_subscription_id,
    p_observed_at
  );

  return p_status;
end;
$$;

create or replace function public.reconcile_stripe_subscription_paid_payment(
  p_provider_subscription_id text,
  p_provider_payment_id text,
  p_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
  latest_paid_observed_at timestamptz;
  latest_paid_provider_payment_id text;
  target_subscription_id uuid;
  subscription_user_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
    or length(btrim(p_provider_subscription_id)) > 255
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;
  if p_provider_payment_id is null
    or btrim(p_provider_payment_id) = ''
    or length(btrim(p_provider_payment_id)) > 255
  then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'payment_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );

  select
    subscription.id,
    subscription.user_id,
    subscription.latest_paid_provider_payment_id,
    subscription.latest_paid_observed_at
  into
    target_subscription_id,
    subscription_user_id,
    latest_paid_provider_payment_id,
    latest_paid_observed_at
  from public.subscriptions as subscription
  where subscription.provider = 'stripe'::billing_provider
    and subscription.provider_subscription_id = p_provider_subscription_id;

  if target_subscription_id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(subscription_user_id::text, 0));

  if latest_paid_observed_at is null
    or p_observed_at > latest_paid_observed_at
    or (
      p_observed_at = latest_paid_observed_at
      and p_provider_payment_id > latest_paid_provider_payment_id
    )
  then
    update public.subscriptions as subscription
    set
      latest_paid_provider_payment_id = p_provider_payment_id,
      latest_paid_observed_at = p_observed_at
    where subscription.id = target_subscription_id;

    latest_paid_provider_payment_id := p_provider_payment_id;
    latest_paid_observed_at := p_observed_at;
  end if;

  update public.subscription_billing_adjustments as adjustment
  set
    superseded_by_provider_payment_id = latest_paid_provider_payment_id,
    superseded_at = latest_paid_observed_at,
    updated_at = clock_timestamp()
  where adjustment.subscription_id = target_subscription_id
    and adjustment.provider = 'stripe'::billing_provider
    and adjustment.kind = 'refund'
    and adjustment.status = 'refunded'
    and adjustment.blocks_access
    and adjustment.superseded_at is null
    and adjustment.provider_payment_id <>
      latest_paid_provider_payment_id
    and adjustment.observed_at < latest_paid_observed_at;

  effective_tier := public.recompute_stripe_subscription_access(
    target_subscription_id,
    latest_paid_observed_at
  );

  return effective_tier;
end;
$$;

create or replace function public.get_phase2_billing_schema_readiness()
returns table (
  adjustment_table boolean,
  adjustment_constraints boolean,
  access_helper boolean,
  adjustment_sync_rpc boolean,
  paid_reconciliation_rpc boolean,
  adjustment_rls boolean,
  service_role_grants boolean,
  authenticated_no_write boolean,
  receipt_allowlist boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  return query
  select
    to_regclass('public.subscription_billing_adjustments') is not null,
    (
      select count(*) = 7
      from pg_catalog.pg_constraint
      where conrelid =
          'public.subscription_billing_adjustments'::regclass
        and conname in (
          'subscription_billing_adjustments_pkey',
          'subscription_billing_adjustments_subscription_id_fkey',
          'subscription_billing_adjustments_provider_identity_key',
          'subscription_billing_adjustments_provider_ids_check',
          'subscription_billing_adjustments_kind_status_check',
          'subscription_billing_adjustments_amount_currency_check',
          'subscription_billing_adjustments_supersession_check'
        )
    ),
    to_regprocedure(
      'public.recompute_stripe_subscription_access(uuid,timestamptz)'
    ) is not null,
    to_regprocedure(
      'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)'
    ) is not null,
    to_regprocedure(
      'public.reconcile_stripe_subscription_paid_payment(text,text,timestamptz)'
    ) is not null,
    exists (
      select 1
      from pg_catalog.pg_class
      where oid = 'public.subscription_billing_adjustments'::regclass
        and relrowsecurity
    )
    and exists (
      select 1
      from pg_catalog.pg_policy
      where polrelid =
          'public.subscription_billing_adjustments'::regclass
        and polname =
          'subscription_billing_adjustments_select_own_or_admin'
    ),
    pg_catalog.has_table_privilege(
      'service_role',
      'public.subscription_billing_adjustments',
      'select,insert,update,delete'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.reconcile_stripe_subscription_paid_payment(text,text,timestamptz)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.close_missing_stripe_customer_subscriptions(text,text[],timestamptz)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.get_phase2_billing_schema_readiness()',
      'execute'
    )
    and not pg_catalog.has_function_privilege(
      'service_role',
      'public.recompute_stripe_subscription_access(uuid,timestamptz)',
      'execute'
    ),
    not pg_catalog.has_table_privilege(
      'authenticated',
      'public.subscription_billing_adjustments',
      'insert,update,delete'
    )
    and not pg_catalog.has_function_privilege(
      'authenticated',
      'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)',
      'execute'
    )
    and not pg_catalog.has_function_privilege(
      'authenticated',
      'public.reconcile_stripe_subscription_paid_payment(text,text,timestamptz)',
      'execute'
    )
    and not pg_catalog.has_function_privilege(
      'authenticated',
      'public.close_missing_stripe_customer_subscriptions(text,text[],timestamptz)',
      'execute'
    )
    and not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_phase2_billing_schema_readiness()',
      'execute'
    ),
    exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = 'public.billing_events'::regclass
        and conname = 'billing_events_stripe_payload_minimized'
        and pg_catalog.pg_get_constraintdef(oid) like '%chargeId%'
        and pg_catalog.pg_get_constraintdef(oid) like '%customerId%'
        and pg_catalog.pg_get_constraintdef(oid) like '%disputeId%'
        and pg_catalog.pg_get_constraintdef(oid) like '%paymentId%'
        and pg_catalog.pg_get_constraintdef(oid) like '%subscriptionId%'
    );
end;
$$;

alter table public.subscription_billing_adjustments enable row level security;

drop policy if exists
"subscription_billing_adjustments_select_own_or_admin"
on public.subscription_billing_adjustments;
create policy "subscription_billing_adjustments_select_own_or_admin"
on public.subscription_billing_adjustments for select
using (
  public.has_role('admin'::user_role)
  or exists (
    select 1
    from public.subscriptions as subscription
    where subscription.id =
        subscription_billing_adjustments.subscription_id
      and subscription.user_id = auth.uid()
  )
);

grant all privileges on table
public.subscription_billing_adjustments to service_role;
grant select on table
public.subscription_billing_adjustments to authenticated;
revoke insert, update, delete on table
public.subscription_billing_adjustments from authenticated;

revoke all on function public.recompute_stripe_subscription_access(
  uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.sync_stripe_subscription_adjustment(
  text, text, text, text, text, integer, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription_adjustment(
  text, text, text, text, text, integer, text, timestamptz
) to service_role;
revoke all on function public.reconcile_stripe_subscription_paid_payment(
  text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.reconcile_stripe_subscription_paid_payment(
  text, text, timestamptz
) to service_role;
revoke all on function public.close_missing_stripe_customer_subscriptions(
  text, text[], timestamptz
) from public, anon, authenticated;
grant execute on function public.close_missing_stripe_customer_subscriptions(
  text, text[], timestamptz
) to service_role;
revoke all on function public.get_phase2_billing_schema_readiness()
from public, anon, authenticated;
grant execute on function public.get_phase2_billing_schema_readiness()
to service_role;
