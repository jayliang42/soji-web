begin;

create table public.guest_full_access_checkouts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  browser_hmac text not null,
  plan_id membership_tier not null default 'tier_1'::membership_tier,
  expected_amount_cents integer not null default 9900,
  expected_currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_expires_at timestamptz not null,
  provider_payment_id text unique,
  provider_payment_status text,
  claim_email_hmac text,
  payment_observed_at timestamptz,
  refund_status text,
  refund_observed_at timestamptz,
  dispute_id text,
  dispute_status text,
  dispute_observed_at timestamptz,
  status text not null default 'created',
  status_observed_at timestamptz not null default clock_timestamp(),
  claimed_user_id uuid references public.profiles (id) on delete restrict,
  claimed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint guest_full_access_browser_hmac_check check (
    browser_hmac ~ '^[0-9a-f]{64}$'
  ),
  constraint guest_full_access_plan_check check (
    plan_id = 'tier_1'::membership_tier
  ),
  constraint guest_full_access_catalog_check check (
    expected_amount_cents = 9900
    and expected_currency = 'usd'
  ),
  constraint guest_full_access_session_check check (
    stripe_checkout_session_id is null
    or (
      stripe_checkout_session_id = btrim(stripe_checkout_session_id)
      and length(stripe_checkout_session_id) <= 255
      and stripe_checkout_session_id ~ '^cs_(test|live)_[A-Za-z0-9]+$'
    )
  ),
  constraint guest_full_access_payment_id_check check (
    provider_payment_id is null
    or (
      provider_payment_id = btrim(provider_payment_id)
      and provider_payment_id <> ''
      and length(provider_payment_id) <= 255
    )
  ),
  constraint guest_full_access_payment_status_check check (
    provider_payment_status is null
    or provider_payment_status in ('paid', 'no_payment_required')
  ),
  constraint guest_full_access_claim_hmac_check check (
    claim_email_hmac is null
    or claim_email_hmac ~ '^[0-9a-f]{64}$'
  ),
  constraint guest_full_access_refund_status_check check (
    refund_status is null
    or refund_status in ('partially_refunded', 'refunded')
  ),
  constraint guest_full_access_dispute_status_check check (
    dispute_status is null
    or dispute_status in (
      'warning_needs_response',
      'warning_under_review',
      'warning_closed',
      'needs_response',
      'under_review',
      'won',
      'lost',
      'prevented'
    )
  ),
  constraint guest_full_access_status_check check (
    status in (
      'created',
      'paid_unclaimed',
      'claimed',
      'refunded',
      'disputed',
      'expired',
      'cancelled'
    )
  ),
  constraint guest_full_access_claimed_identity_check check (
    (claimed_user_id is null and claimed_at is null)
    or (claimed_user_id is not null and claimed_at is not null)
  ),
  constraint guest_full_access_claimed_status_check check (
    status <> 'claimed' or claimed_user_id is not null
  ),
  constraint guest_full_access_paid_evidence_check check (
    status <> 'paid_unclaimed' or (
      provider_payment_id is not null
      and provider_payment_status in ('paid', 'no_payment_required')
      and payment_observed_at is not null
      and claim_email_hmac is not null
      and claimed_user_id is null
    )
  ),
  constraint guest_full_access_claim_evidence_check check (
    status <> 'claimed' or (
      provider_payment_id is not null
      and provider_payment_status in ('paid', 'no_payment_required')
      and payment_observed_at is not null
      and claimed_user_id is not null
      and claimed_at is not null
      and claim_email_hmac is null
    )
  ),
  constraint guest_full_access_refund_evidence_check check (
    status <> 'refunded' or (
      provider_payment_id is not null
      and refund_status = 'refunded'
      and refund_observed_at is not null
      and claim_email_hmac is null
    )
  ),
  constraint guest_full_access_dispute_evidence_check check (
    status <> 'disputed' or (
      provider_payment_id is not null
      and dispute_id is not null
      and dispute_status in (
        'warning_needs_response',
        'warning_under_review',
        'needs_response',
        'under_review',
        'lost'
      )
      and dispute_observed_at is not null
    )
  )
);

create index guest_full_access_checkouts_browser_status_idx
on public.guest_full_access_checkouts (browser_hmac, status, created_at desc);

create index guest_full_access_checkouts_email_status_idx
on public.guest_full_access_checkouts (claim_email_hmac, status, created_at)
where claim_email_hmac is not null;

create index guest_full_access_checkouts_expiry_idx
on public.guest_full_access_checkouts (stripe_expires_at)
where status = 'created';

alter table public.guest_full_access_checkouts enable row level security;
revoke all on table public.guest_full_access_checkouts
from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.guest_full_access_checkouts
to service_role;

create table public.guest_full_access_checkout_rate_limits (
  dimension text not null,
  identity_hmac text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (dimension, identity_hmac),
  constraint guest_full_access_rate_dimension_check check (
    dimension in ('browser', 'network')
  ),
  constraint guest_full_access_rate_hmac_check check (
    identity_hmac ~ '^[0-9a-f]{64}$'
  )
);

create index guest_full_access_checkout_rate_limits_updated_idx
on public.guest_full_access_checkout_rate_limits (updated_at);

alter table public.guest_full_access_checkout_rate_limits enable row level security;
revoke all on table public.guest_full_access_checkout_rate_limits
from public, anon, authenticated, service_role;
grant select, insert, update, delete
on table public.guest_full_access_checkout_rate_limits to service_role;

create or replace function public.consume_guest_full_access_checkout_rate_limit(
  p_browser_hmac text,
  p_network_hmac text
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  request_time timestamptz := clock_timestamp();
  browser_limit constant integer := 5;
  network_limit constant integer := 20;
  window_duration constant interval := interval '10 minutes';
  browser_count integer;
  browser_window_started_at timestamptz;
  network_count integer;
  network_window_started_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_browser_hmac is null or p_browser_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'browser_hmac_invalid' using errcode = '22023';
  end if;
  if p_network_hmac is null or p_network_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'network_hmac_invalid' using errcode = '22023';
  end if;

  delete from public.guest_full_access_checkout_rate_limits as rate_limit
  where rate_limit.ctid in (
    select stale_rate_limit.ctid
    from public.guest_full_access_checkout_rate_limits as stale_rate_limit
    where stale_rate_limit.updated_at < request_time - interval '1 hour'
    order by stale_rate_limit.updated_at
    limit 100
  );

  insert into public.guest_full_access_checkout_rate_limits (
    dimension,
    identity_hmac,
    window_started_at,
    request_count,
    updated_at
  ) values (
    'network',
    p_network_hmac,
    request_time,
    1,
    request_time
  )
  on conflict (dimension, identity_hmac) do update
  set
    request_count = case
      when guest_full_access_checkout_rate_limits.window_started_at <=
        request_time - window_duration then 1
      else least(
        guest_full_access_checkout_rate_limits.request_count + 1,
        2147483647
      )
    end,
    window_started_at = case
      when guest_full_access_checkout_rate_limits.window_started_at <=
        request_time - window_duration then request_time
      else guest_full_access_checkout_rate_limits.window_started_at
    end,
    updated_at = request_time
  returning request_count, window_started_at
  into network_count, network_window_started_at;

  if network_count > network_limit then
    return query select
      false,
      0,
      network_window_started_at + window_duration;
    return;
  end if;

  insert into public.guest_full_access_checkout_rate_limits (
    dimension,
    identity_hmac,
    window_started_at,
    request_count,
    updated_at
  ) values (
    'browser',
    p_browser_hmac,
    request_time,
    1,
    request_time
  )
  on conflict (dimension, identity_hmac) do update
  set
    request_count = case
      when guest_full_access_checkout_rate_limits.window_started_at <=
        request_time - window_duration then 1
      else least(
        guest_full_access_checkout_rate_limits.request_count + 1,
        2147483647
      )
    end,
    window_started_at = case
      when guest_full_access_checkout_rate_limits.window_started_at <=
        request_time - window_duration then request_time
      else guest_full_access_checkout_rate_limits.window_started_at
    end,
    updated_at = request_time
  returning request_count, window_started_at
  into browser_count, browser_window_started_at;

  return query select
    browser_count <= browser_limit,
    least(
      greatest(browser_limit - browser_count, 0),
      greatest(network_limit - network_count, 0)
    ),
    case when browser_count > browser_limit then
        browser_window_started_at + window_duration
      else least(
        browser_window_started_at + window_duration,
        network_window_started_at + window_duration
      )
    end;
end;
$$;

create or replace function public.reserve_guest_full_access_checkout(
  p_request_id uuid,
  p_browser_hmac text
)
returns table (
  outcome text,
  checkout_id uuid,
  expected_amount_cents integer,
  expected_currency text,
  stripe_expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
  request_time timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if p_browser_hmac is null or p_browser_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'browser_hmac_invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.guest-checkout-request:' || p_request_id::text, 0)
  );

  select checkout.*
  into checkout_record
  from public.guest_full_access_checkouts as checkout
  where checkout.request_id = p_request_id
  for update;

  if found then
    if checkout_record.browser_hmac <> p_browser_hmac then
      raise exception 'guest_checkout_request_conflict' using errcode = '23505';
    end if;

    return query select
      'existing'::text,
      checkout_record.id,
      checkout_record.expected_amount_cents,
      checkout_record.expected_currency,
      checkout_record.stripe_expires_at;
    return;
  end if;

  insert into public.guest_full_access_checkouts (
    request_id,
    browser_hmac,
    stripe_expires_at,
    status_observed_at,
    created_at,
    updated_at
  ) values (
    p_request_id,
    p_browser_hmac,
    request_time + interval '35 minutes',
    request_time,
    request_time,
    request_time
  )
  returning * into checkout_record;

  return query select
    'reserved'::text,
    checkout_record.id,
    checkout_record.expected_amount_cents,
    checkout_record.expected_currency,
    checkout_record.stripe_expires_at;
end;
$$;

create or replace function public.attach_guest_full_access_checkout(
  p_request_id uuid,
  p_browser_hmac text,
  p_stripe_checkout_session_id text,
  p_stripe_expires_at timestamptz
)
returns table (outcome text, checkout_id uuid)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
  request_time timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if p_browser_hmac is null or p_browser_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'browser_hmac_invalid' using errcode = '22023';
  end if;
  if p_stripe_checkout_session_id is null
    or p_stripe_checkout_session_id !~ '^cs_(test|live)_[A-Za-z0-9]+$'
    or length(p_stripe_checkout_session_id) > 255
  then
    raise exception 'checkout_session_id_invalid' using errcode = '22023';
  end if;
  if p_stripe_expires_at is null then
    raise exception 'checkout_expiry_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.guest-checkout-request:' || p_request_id::text, 0)
  );

  select checkout.*
  into checkout_record
  from public.guest_full_access_checkouts as checkout
  where checkout.request_id = p_request_id
  for update;

  if not found or checkout_record.browser_hmac <> p_browser_hmac then
    raise exception 'guest_checkout_not_found' using errcode = 'P0002';
  end if;
  if abs(
    extract(epoch from (checkout_record.stripe_expires_at - p_stripe_expires_at))
  ) > 1 then
    raise exception 'guest_checkout_expiry_mismatch' using errcode = '23514';
  end if;
  if checkout_record.stripe_checkout_session_id is not null then
    if checkout_record.stripe_checkout_session_id <> p_stripe_checkout_session_id then
      raise exception 'guest_checkout_session_conflict' using errcode = '23505';
    end if;
    return query select 'existing'::text, checkout_record.id;
    return;
  end if;
  if checkout_record.status <> 'created'
    or checkout_record.stripe_expires_at <= request_time
  then
    raise exception 'guest_checkout_not_attachable' using errcode = '55000';
  end if;

  update public.guest_full_access_checkouts as checkout
  set
    stripe_checkout_session_id = p_stripe_checkout_session_id,
    updated_at = request_time
  where checkout.id = checkout_record.id;

  return query select 'attached'::text, checkout_record.id;
end;
$$;

create or replace function public.record_stripe_guest_full_access_payment(
  p_stripe_checkout_session_id text,
  p_provider_payment_id text,
  p_payment_status text,
  p_amount_total integer,
  p_currency text,
  p_email_hmac text,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
  next_status text;
  blocks_access boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_stripe_checkout_session_id is null
    or p_stripe_checkout_session_id !~ '^cs_(test|live)_[A-Za-z0-9]+$'
  then
    raise exception 'checkout_session_id_invalid' using errcode = '22023';
  end if;
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_payment_status not in ('paid', 'no_payment_required') then
    raise exception 'guest_payment_not_complete' using errcode = '23514';
  end if;
  if p_amount_total <> 9900 or lower(coalesce(p_currency, '')) <> 'usd' then
    raise exception 'guest_payment_catalog_mismatch' using errcode = '23514';
  end if;
  if p_email_hmac is null or p_email_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'email_hmac_invalid' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'payment_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select checkout.*
  into checkout_record
  from public.guest_full_access_checkouts as checkout
  where checkout.stripe_checkout_session_id = p_stripe_checkout_session_id
  for update;

  if not found then
    raise exception 'guest_checkout_not_found' using errcode = 'P0002';
  end if;
  if checkout_record.expected_amount_cents <> p_amount_total
    or checkout_record.expected_currency <> lower(p_currency)
  then
    raise exception 'guest_payment_catalog_mismatch' using errcode = '23514';
  end if;
  if checkout_record.provider_payment_id is not null
    and checkout_record.provider_payment_id <> p_provider_payment_id
  then
    raise exception 'guest_payment_conflict' using errcode = '23505';
  end if;
  if checkout_record.claim_email_hmac is not null
    and checkout_record.claim_email_hmac <> p_email_hmac
  then
    raise exception 'guest_payment_email_conflict' using errcode = '23505';
  end if;

  if checkout_record.payment_observed_at is null
    or p_observed_at >= checkout_record.payment_observed_at
  then
    update public.guest_full_access_checkouts as checkout
    set
      provider_payment_id = p_provider_payment_id,
      provider_payment_status = p_payment_status,
      payment_observed_at = p_observed_at,
      updated_at = greatest(checkout.updated_at, p_observed_at)
    where checkout.id = checkout_record.id;

    checkout_record.provider_payment_id := p_provider_payment_id;
    checkout_record.provider_payment_status := p_payment_status;
    checkout_record.payment_observed_at := p_observed_at;
  end if;

  blocks_access := checkout_record.dispute_status in (
    'warning_needs_response',
    'warning_under_review',
    'needs_response',
    'under_review',
    'lost'
  );
  next_status := case
    when checkout_record.refund_status = 'refunded' then 'refunded'
    when blocks_access then 'disputed'
    when checkout_record.claimed_user_id is not null then 'claimed'
    else 'paid_unclaimed'
  end;

  update public.guest_full_access_checkouts as checkout
  set
    claim_email_hmac = case
      when next_status = 'refunded' then null
      when checkout_record.claimed_user_id is null then p_email_hmac
      else null
    end,
    status = next_status,
    status_observed_at = greatest(checkout.status_observed_at, p_observed_at),
    updated_at = greatest(checkout.updated_at, p_observed_at)
  where checkout.id = checkout_record.id;

  return next_status;
end;
$$;

create or replace function public.claim_guest_full_access_checkout(
  p_user_id uuid,
  p_verified_email_hmac text,
  p_browser_hmac text default null,
  p_request_id uuid default null
)
returns table (outcome text, effective_tier membership_tier)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
  claim_time timestamptz := clock_timestamp();
  resolved_tier membership_tier;
  claimed_count integer := 0;
  candidate_checkout_ids uuid[] := array[]::uuid[];
  candidate_payment_id text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'claim_user_id_required' using errcode = '22023';
  end if;
  if p_verified_email_hmac is null
    or p_verified_email_hmac !~ '^[0-9a-f]{64}$'
  then
    raise exception 'verified_email_hmac_invalid' using errcode = '22023';
  end if;
  if p_browser_hmac is not null
    and p_browser_hmac !~ '^[0-9a-f]{64}$'
  then
    raise exception 'browser_hmac_invalid' using errcode = '22023';
  end if;
  if p_request_id is not null and p_browser_hmac is null then
    raise exception 'claim_request_browser_required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles as profile where profile.id = p_user_id
  ) then
    raise exception 'claim_profile_missing' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.guest-checkout-email:' || p_verified_email_hmac, 0)
  );

  select coalesce(
    array_agg(checkout.id order by checkout.created_at, checkout.id),
    array[]::uuid[]
  )
  into candidate_checkout_ids
  from public.guest_full_access_checkouts as checkout
  where checkout.claim_email_hmac = p_verified_email_hmac
    and checkout.status = 'paid_unclaimed'
    and checkout.provider_payment_id is not null
    and checkout.provider_payment_status in ('paid', 'no_payment_required')
    and checkout.refund_status is distinct from 'refunded'
    and coalesce(
      checkout.dispute_status not in (
        'warning_needs_response',
        'warning_under_review',
        'needs_response',
        'under_review',
        'lost'
      ),
      true
    );

  for candidate_payment_id in
    select checkout.provider_payment_id
    from public.guest_full_access_checkouts as checkout
    where checkout.id = any(candidate_checkout_ids)
    order by checkout.provider_payment_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('soji.stripe-payment:' || candidate_payment_id, 0)
    );
  end loop;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.subscription-checkout:' || p_user_id::text, 0)
  );

  for checkout_record in
    select checkout.*
    from public.guest_full_access_checkouts as checkout
    where checkout.id = any(candidate_checkout_ids)
      and checkout.claim_email_hmac = p_verified_email_hmac
      and checkout.status = 'paid_unclaimed'
      and checkout.provider_payment_id is not null
      and checkout.provider_payment_status in ('paid', 'no_payment_required')
      and checkout.refund_status is distinct from 'refunded'
      and coalesce(
        checkout.dispute_status not in (
          'warning_needs_response',
          'warning_under_review',
          'needs_response',
          'under_review',
          'lost'
        ),
        true
      )
    order by checkout.created_at, checkout.id
    for update
  loop
    select public.sync_stripe_membership_purchase(
      p_user_id,
      checkout_record.plan_id,
      checkout_record.provider_payment_id,
      checkout_record.provider_payment_status,
      checkout_record.payment_observed_at
    ) into resolved_tier;

    if checkout_record.refund_status = 'partially_refunded' then
      select public.sync_stripe_membership_refund(
        checkout_record.provider_payment_id,
        'partially_refunded',
        checkout_record.refund_observed_at
      ) into resolved_tier;
    end if;

    update public.guest_full_access_checkouts as checkout
    set
      status = 'claimed',
      claim_email_hmac = null,
      claimed_user_id = p_user_id,
      claimed_at = claim_time,
      status_observed_at = claim_time,
      updated_at = claim_time
    where checkout.id = checkout_record.id;

    claimed_count := claimed_count + 1;
  end loop;

  if claimed_count > 0 then
    return query select 'claimed'::text, resolved_tier;
    return;
  end if;

  select profile.tier
  into resolved_tier
  from public.profiles as profile
  where profile.id = p_user_id;

  if exists (
    select 1
    from public.guest_full_access_checkouts as checkout
    where checkout.claim_email_hmac = p_verified_email_hmac
      and checkout.status = 'paid_unclaimed'
      and checkout.provider_payment_id is not null
      and checkout.provider_payment_status in ('paid', 'no_payment_required')
  ) then
    return query select 'processing'::text, resolved_tier;
    return;
  end if;

  if p_browser_hmac is not null and p_request_id is not null and exists (
    select 1
    from public.guest_full_access_checkouts as checkout
    where checkout.claimed_user_id = p_user_id
      and checkout.status = 'claimed'
      and checkout.browser_hmac = p_browser_hmac
      and checkout.request_id = p_request_id
  ) then
    return query select 'claimed'::text, resolved_tier;
    return;
  end if;

  if p_browser_hmac is not null and exists (
    select 1
    from public.guest_full_access_checkouts as checkout
    where checkout.browser_hmac = p_browser_hmac
      and (p_request_id is null or checkout.request_id = p_request_id)
      and checkout.status = 'paid_unclaimed'
      and checkout.claim_email_hmac is distinct from p_verified_email_hmac
  ) then
    return query select 'email_mismatch'::text, resolved_tier;
    return;
  end if;

  if p_browser_hmac is not null and exists (
    select 1
    from public.guest_full_access_checkouts as checkout
    where checkout.browser_hmac = p_browser_hmac
      and (p_request_id is null or checkout.request_id = p_request_id)
      and checkout.status = 'created'
      and checkout.stripe_expires_at > claim_time
  ) then
    return query select 'processing'::text, resolved_tier;
    return;
  end if;

  return query select 'invalid'::text, resolved_tier;
end;
$$;

create or replace function public.sync_stripe_guest_full_access_refund(
  p_guest_checkout_id uuid,
  p_provider_payment_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns table (outcome text, effective_tier membership_tier)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
  applied_observed_at timestamptz := p_observed_at;
  applied_status text := p_status;
  membership_observed_at timestamptz;
  membership_status text;
  next_status text;
  resolved_tier membership_tier;
  blocks_access boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_guest_checkout_id is null then
    raise exception 'guest_checkout_id_required' using errcode = '22023';
  end if;
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_status not in ('partially_refunded', 'refunded') then
    raise exception 'guest_refund_status_invalid' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'refund_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select checkout.*
  into checkout_record
  from public.guest_full_access_checkouts as checkout
  where checkout.id = p_guest_checkout_id
  for update;

  if not found then
    raise exception 'guest_checkout_not_found' using errcode = 'P0002';
  end if;
  if checkout_record.provider_payment_id is not null
    and checkout_record.provider_payment_id <> p_provider_payment_id
  then
    raise exception 'guest_payment_conflict' using errcode = '23505';
  end if;

  if checkout_record.refund_status = 'refunded' or (
    checkout_record.refund_observed_at is not null and (
      p_observed_at < checkout_record.refund_observed_at
      or (
        p_observed_at = checkout_record.refund_observed_at
        and checkout_record.refund_status = 'refunded'
      )
    )
  ) then
    return query select checkout_record.status, null::membership_tier;
    return;
  end if;

  if checkout_record.claimed_user_id is not null then
    select public.sync_stripe_membership_refund(
      p_provider_payment_id,
      p_status,
      p_observed_at
    ) into resolved_tier;

    select purchase.status, purchase.status_observed_at
    into membership_status, membership_observed_at
    from public.membership_purchases as purchase
    where purchase.provider = 'stripe'::billing_provider
      and purchase.provider_payment_id = p_provider_payment_id
      and purchase.user_id = checkout_record.claimed_user_id;

    if membership_status is null
      or membership_status not in ('partially_refunded', 'refunded')
    then
      return query select checkout_record.status, resolved_tier;
      return;
    end if;

    applied_status := membership_status;
    applied_observed_at := membership_observed_at;
  end if;

  if checkout_record.refund_observed_at is not null and (
    applied_observed_at < checkout_record.refund_observed_at
    or (
      applied_observed_at = checkout_record.refund_observed_at
      and checkout_record.refund_status = 'refunded'
    )
  ) then
    return query select checkout_record.status, resolved_tier;
    return;
  end if;

  blocks_access := checkout_record.dispute_status in (
    'warning_needs_response',
    'warning_under_review',
    'needs_response',
    'under_review',
    'lost'
  );
  next_status := case
    when applied_status = 'refunded' then 'refunded'
    when blocks_access then 'disputed'
    when checkout_record.claimed_user_id is not null then 'claimed'
    when checkout_record.provider_payment_status in ('paid', 'no_payment_required')
      and checkout_record.claim_email_hmac is not null then 'paid_unclaimed'
    else 'created'
  end;

  update public.guest_full_access_checkouts as checkout
  set
    provider_payment_id = coalesce(
      checkout.provider_payment_id,
      p_provider_payment_id
    ),
    refund_status = applied_status,
    refund_observed_at = applied_observed_at,
    status = next_status,
    claim_email_hmac = case
      when applied_status = 'refunded' then null
      else checkout.claim_email_hmac
    end,
    status_observed_at = greatest(
      checkout.status_observed_at,
      applied_observed_at
    ),
    updated_at = greatest(checkout.updated_at, applied_observed_at)
  where checkout.id = checkout_record.id;

  return query select next_status, resolved_tier;
end;
$$;

create or replace function public.sync_stripe_guest_full_access_dispute(
  p_guest_checkout_id uuid,
  p_provider_payment_id text,
  p_provider_dispute_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns table (outcome text, effective_tier membership_tier)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
  next_status text;
  resolved_tier membership_tier;
  blocks_access boolean;
  current_rank integer;
  incoming_rank integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_guest_checkout_id is null then
    raise exception 'guest_checkout_id_required' using errcode = '22023';
  end if;
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_provider_dispute_id is null or btrim(p_provider_dispute_id) = '' then
    raise exception 'provider_dispute_id_required' using errcode = '22023';
  end if;
  if p_status not in (
    'warning_needs_response',
    'warning_under_review',
    'warning_closed',
    'needs_response',
    'under_review',
    'won',
    'lost',
    'prevented'
  ) then
    raise exception 'guest_dispute_status_invalid' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'dispute_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select checkout.*
  into checkout_record
  from public.guest_full_access_checkouts as checkout
  where checkout.id = p_guest_checkout_id
  for update;

  if not found then
    raise exception 'guest_checkout_not_found' using errcode = 'P0002';
  end if;
  if checkout_record.provider_payment_id is not null
    and checkout_record.provider_payment_id <> p_provider_payment_id
  then
    raise exception 'guest_payment_conflict' using errcode = '23505';
  end if;

  current_rank := case checkout_record.dispute_status
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

  if checkout_record.dispute_observed_at is not null and (
    p_observed_at < checkout_record.dispute_observed_at
    or (
      p_observed_at = checkout_record.dispute_observed_at
      and (
        (
          p_provider_dispute_id = checkout_record.dispute_id
          and incoming_rank <= current_rank
        )
        or (
          p_provider_dispute_id <> checkout_record.dispute_id
          and p_provider_dispute_id <= checkout_record.dispute_id
        )
      )
    )
  ) then
    return query select checkout_record.status, null::membership_tier;
    return;
  end if;

  if checkout_record.claimed_user_id is not null then
    select public.sync_stripe_membership_dispute(
      p_provider_payment_id,
      p_provider_dispute_id,
      p_status,
      p_observed_at
    ) into resolved_tier;
  end if;

  blocks_access := p_status in (
    'warning_needs_response',
    'warning_under_review',
    'needs_response',
    'under_review',
    'lost'
  );
  next_status := case
    when checkout_record.refund_status = 'refunded' then 'refunded'
    when checkout_record.claimed_user_id is not null and blocks_access
      then 'disputed'
    when checkout_record.claimed_user_id is not null then 'claimed'
    when blocks_access then 'disputed'
    when checkout_record.provider_payment_status in ('paid', 'no_payment_required')
      and checkout_record.claim_email_hmac is not null then 'paid_unclaimed'
    else 'created'
  end;

  update public.guest_full_access_checkouts as checkout
  set
    provider_payment_id = coalesce(
      checkout.provider_payment_id,
      p_provider_payment_id
    ),
    dispute_id = p_provider_dispute_id,
    dispute_status = p_status,
    dispute_observed_at = p_observed_at,
    status = next_status,
    status_observed_at = greatest(checkout.status_observed_at, p_observed_at),
    updated_at = greatest(checkout.updated_at, p_observed_at)
  where checkout.id = checkout_record.id;

  return query select next_status, resolved_tier;
end;
$$;

create or replace function public.get_guest_full_access_checkout_for_cancel(
  p_request_id uuid,
  p_browser_hmac text
)
returns table (
  checkout_id uuid,
  stripe_checkout_session_id text,
  status text,
  stripe_expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if p_browser_hmac is null or p_browser_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'browser_hmac_invalid' using errcode = '22023';
  end if;

  return query
  select
    checkout.id,
    checkout.stripe_checkout_session_id,
    checkout.status,
    checkout.stripe_expires_at
  from public.guest_full_access_checkouts as checkout
  where checkout.request_id = p_request_id
    and checkout.browser_hmac = p_browser_hmac
    and checkout.status = 'created'
    and checkout.stripe_checkout_session_id is not null;
end;
$$;

create or replace function public.close_guest_full_access_checkout(
  p_reason text,
  p_request_id uuid default null,
  p_browser_hmac text default null,
  p_stripe_checkout_session_id text default null,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  checkout_record public.guest_full_access_checkouts%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_reason not in ('cancelled', 'expired') then
    raise exception 'close_reason_invalid' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'close_observed_at_required' using errcode = '22023';
  end if;
  if (
    p_stripe_checkout_session_id is not null
    and (p_request_id is not null or p_browser_hmac is not null)
  ) or (
    p_stripe_checkout_session_id is null
    and (p_request_id is null or p_browser_hmac is null)
  ) then
    raise exception 'close_selector_invalid' using errcode = '22023';
  end if;
  if p_browser_hmac is not null
    and p_browser_hmac !~ '^[0-9a-f]{64}$'
  then
    raise exception 'browser_hmac_invalid' using errcode = '22023';
  end if;

  if p_stripe_checkout_session_id is not null then
    select checkout.*
    into checkout_record
    from public.guest_full_access_checkouts as checkout
    where checkout.stripe_checkout_session_id = p_stripe_checkout_session_id
    for update;
  else
    perform pg_advisory_xact_lock(
      hashtextextended('soji.guest-checkout-request:' || p_request_id::text, 0)
    );
    select checkout.*
    into checkout_record
    from public.guest_full_access_checkouts as checkout
    where checkout.request_id = p_request_id
      and checkout.browser_hmac = p_browser_hmac
    for update;
  end if;

  if not found then
    raise exception 'guest_checkout_not_found' using errcode = 'P0002';
  end if;

  if checkout_record.status <> 'created' then
    return checkout_record.status;
  end if;

  update public.guest_full_access_checkouts as checkout
  set
    status = p_reason,
    claim_email_hmac = null,
    status_observed_at = greatest(checkout.status_observed_at, p_observed_at),
    updated_at = greatest(checkout.updated_at, p_observed_at)
  where checkout.id = checkout_record.id;

  return p_reason;
end;
$$;

revoke all on function
  public.consume_guest_full_access_checkout_rate_limit(text, text)
from public, anon, authenticated;
revoke all on function public.reserve_guest_full_access_checkout(uuid, text)
from public, anon, authenticated;
revoke all on function
  public.attach_guest_full_access_checkout(uuid, text, text, timestamptz)
from public, anon, authenticated;
revoke all on function public.record_stripe_guest_full_access_payment(
  text, text, text, integer, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.claim_guest_full_access_checkout(uuid, text, text, uuid)
from public, anon, authenticated;
revoke all on function public.sync_stripe_guest_full_access_refund(
  uuid, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.sync_stripe_guest_full_access_dispute(
  uuid, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.get_guest_full_access_checkout_for_cancel(uuid, text)
from public, anon, authenticated;
revoke all on function public.close_guest_full_access_checkout(
  text, uuid, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function
  public.consume_guest_full_access_checkout_rate_limit(text, text)
to service_role;
grant execute on function public.reserve_guest_full_access_checkout(uuid, text)
to service_role;
grant execute on function
  public.attach_guest_full_access_checkout(uuid, text, text, timestamptz)
to service_role;
grant execute on function public.record_stripe_guest_full_access_payment(
  text, text, text, integer, text, text, timestamptz
) to service_role;
grant execute on function public.claim_guest_full_access_checkout(uuid, text, text, uuid)
to service_role;
grant execute on function public.sync_stripe_guest_full_access_refund(
  uuid, text, text, timestamptz
) to service_role;
grant execute on function public.sync_stripe_guest_full_access_dispute(
  uuid, text, text, text, timestamptz
) to service_role;
grant execute on function public.get_guest_full_access_checkout_for_cancel(uuid, text)
to service_role;
grant execute on function public.close_guest_full_access_checkout(
  text, uuid, text, text, timestamptz
) to service_role;

commit;
