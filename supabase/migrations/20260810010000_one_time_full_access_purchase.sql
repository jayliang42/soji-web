begin;

-- The single Full Access offer is a one-time payment, not a renewing
-- subscription. Keep the legacy monthly_price column for compatibility with
-- older clients, but make the billing mode explicit for new code.
alter table public.membership_plans
  add column if not exists billing_type text not null default 'recurring';

alter table public.membership_plans
  drop constraint if exists membership_plans_billing_type_check;

alter table public.membership_plans
  add constraint membership_plans_billing_type_check
  check (billing_type in ('one_time', 'recurring'));

update public.membership_plans
set
  billing_type = 'one_time',
  stripe_lookup_key = 'full_access_once'
where id = 'tier_1'::membership_tier;

create table if not exists public.membership_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id membership_tier not null references public.membership_plans (id),
  provider billing_provider not null,
  provider_payment_id text not null unique,
  status text not null,
  dispute_id text,
  dispute_status text,
  status_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists membership_purchases_user_created_idx
on public.membership_purchases (user_id, created_at desc);

alter table public.membership_purchases enable row level security;

drop policy if exists "membership_purchases_select_own_or_admin"
on public.membership_purchases;

create policy "membership_purchases_select_own_or_admin"
on public.membership_purchases for select
using (
  user_id = auth.uid()
  or public.is_editor_or_admin()
);

revoke all on table public.membership_purchases from anon, authenticated;
grant select on table public.membership_purchases to authenticated;
grant all on table public.membership_purchases to service_role;

create or replace function public.recompute_full_access_profile(p_user_id uuid)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
begin
  select case when exists (
    select 1
    from public.user_entitlements entitlement
    where entitlement.user_id = p_user_id
      and entitlement.entitlement_id = 'content.all'
      and (
        entitlement.ends_at is null
        or entitlement.ends_at > clock_timestamp()
      )
  ) or exists (
    select 1
    from public.subscriptions subscription
    where subscription.user_id = p_user_id
      and subscription.status in ('active', 'trialing')
  ) then 'tier_1'::membership_tier else 'free'::membership_tier end
  into effective_tier;

  update public.profiles
  set tier = effective_tier
  where id = p_user_id;

  return effective_tier;
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
begin
  if p_user_id is null or p_plan_id = 'free'::membership_tier then
    raise exception 'membership_purchase_identity_invalid' using errcode = '22023';
  end if;

  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;

  if p_status not in ('paid', 'no_payment_required') then
    raise exception 'membership_payment_not_complete' using errcode = '23514';
  end if;

  select purchase.user_id, purchase.plan_id
  into existing_user_id, existing_plan_id
  from public.membership_purchases purchase
  where purchase.provider_payment_id = p_provider_payment_id;

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
  where membership_purchases.status_observed_at <= excluded.status_observed_at;

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
    p_observed_at,
    null
  from public.plan_entitlements plan_entitlement
  where plan_entitlement.plan_id = p_plan_id
  on conflict (user_id, entitlement_id, source_type, source_id) do update
  set ends_at = null;

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
begin
  if p_status not in ('partially_refunded', 'refunded') then
    raise exception 'membership_refund_status_invalid' using errcode = '22023';
  end if;

  update public.membership_purchases
  set
    status = p_status,
    status_observed_at = p_observed_at
  where provider_payment_id = p_provider_payment_id
    and status_observed_at <= p_observed_at
  returning user_id into purchase_user_id;

  if purchase_user_id is null then
    raise exception 'membership_purchase_not_found' using errcode = 'P0002';
  end if;

  if p_status = 'refunded' then
    delete from public.user_entitlements
    where source_type = 'membership_purchase'
      and source_id = p_provider_payment_id;
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
begin
  update public.membership_purchases
  set
    dispute_id = p_provider_dispute_id,
    dispute_status = p_status,
    status_observed_at = p_observed_at
  where provider_payment_id = p_provider_payment_id
    and status_observed_at <= p_observed_at
  returning user_id, plan_id, status
  into purchase_user_id, purchase_plan_id, purchase_status;

  if purchase_user_id is null then
    raise exception 'membership_purchase_not_found' using errcode = 'P0002';
  end if;

  if p_status in ('won', 'prevented')
    and purchase_status in ('paid', 'no_payment_required', 'partially_refunded')
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
      purchase_user_id,
      plan_entitlement.entitlement_id,
      'membership_purchase',
      p_provider_payment_id,
      clock_timestamp(),
      null
    from public.plan_entitlements plan_entitlement
    where plan_entitlement.plan_id = purchase_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = null;
  elsif p_status not in ('warning_closed', 'closed') then
    delete from public.user_entitlements
    where source_type = 'membership_purchase'
      and source_id = p_provider_payment_id;
  end if;

  return public.recompute_full_access_profile(purchase_user_id);
end;
$$;

revoke all on function public.recompute_full_access_profile(uuid) from public, anon, authenticated;
revoke all on function public.sync_stripe_membership_purchase(uuid, membership_tier, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.sync_stripe_membership_refund(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.sync_stripe_membership_dispute(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.sync_stripe_membership_purchase(uuid, membership_tier, text, text, timestamptz) to service_role;
grant execute on function public.sync_stripe_membership_refund(text, text, timestamptz) to service_role;
grant execute on function public.sync_stripe_membership_dispute(text, text, text, timestamptz) to service_role;

commit;
