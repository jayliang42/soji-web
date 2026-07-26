create table if not exists public.stripe_customer_reconciliation_tokens (
  reconciliation_token uuid primary key default gen_random_uuid(),
  provider billing_provider not null default 'stripe',
  provider_customer_id text not null,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint stripe_customer_reconciliation_tokens_provider_check check (
    provider = 'stripe'::billing_provider
  ),
  constraint stripe_customer_reconciliation_tokens_customer_check check (
    provider_customer_id = btrim(provider_customer_id)
    and provider_customer_id <> ''
    and length(provider_customer_id) <= 255
  ),
  constraint stripe_customer_reconciliation_tokens_lifetime_check check (
    expires_at > started_at
    and expires_at <= started_at + interval '15 minutes'
    and (
      consumed_at is null
      or (
        consumed_at >= started_at
        and consumed_at <= expires_at
      )
    )
  )
);

alter table public.stripe_customer_reconciliation_tokens
enable row level security;

revoke all privileges on table
public.stripe_customer_reconciliation_tokens
from public, anon, authenticated, service_role;

create or replace function public.begin_stripe_customer_reconciliation(
  p_provider_customer_id text
)
returns table (
  reconciliation_token uuid,
  started_at timestamptz,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  database_started_at timestamptz := clock_timestamp();
  issued_token uuid;
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

  delete from public.stripe_customer_reconciliation_tokens as token
  where token.expires_at <
      database_started_at - interval '1 hour'
    or token.consumed_at <
      database_started_at - interval '1 hour';

  insert into public.stripe_customer_reconciliation_tokens (
    provider,
    provider_customer_id,
    started_at,
    expires_at
  ) values (
    'stripe'::billing_provider,
    p_provider_customer_id,
    database_started_at,
    database_started_at + interval '15 minutes'
  )
  returning
    stripe_customer_reconciliation_tokens.reconciliation_token
  into issued_token;

  return query
  select
    issued_token,
    database_started_at,
    database_started_at + interval '15 minutes';
end;
$$;

drop function if exists
public.close_missing_stripe_customer_subscriptions(
  text,
  text[],
  timestamptz
);

create or replace function public.close_missing_stripe_customer_subscriptions(
  p_provider_customer_id text,
  p_remote_subscription_ids text[],
  p_reconciliation_token uuid
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
  database_now timestamptz := clock_timestamp();
  reconciliation_consumed_at timestamptz;
  reconciliation_customer_id text;
  reconciliation_expires_at timestamptz;
  reconciliation_started_at timestamptz;
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
  if p_reconciliation_token is null then
    raise exception 'reconciliation_token_required' using errcode = '22023';
  end if;

  select
    token.provider_customer_id,
    token.started_at,
    token.expires_at,
    token.consumed_at
  into
    reconciliation_customer_id,
    reconciliation_started_at,
    reconciliation_expires_at,
    reconciliation_consumed_at
  from public.stripe_customer_reconciliation_tokens as token
  where token.reconciliation_token = p_reconciliation_token
    and token.provider = 'stripe'::billing_provider
  for update;

  if not found then
    raise exception 'reconciliation_token_invalid' using errcode = '22023';
  end if;
  if reconciliation_customer_id <> p_provider_customer_id then
    raise exception 'reconciliation_token_customer_mismatch'
      using errcode = '22023';
  end if;
  if reconciliation_consumed_at is not null then
    raise exception 'reconciliation_token_consumed' using errcode = '55000';
  end if;
  if database_now > reconciliation_expires_at then
    raise exception 'reconciliation_token_expired' using errcode = '55000';
  end if;

  update public.stripe_customer_reconciliation_tokens as token
  set consumed_at = database_now
  where token.reconciliation_token = p_reconciliation_token;

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
      and subscription.created_at <= reconciliation_started_at
      and subscription.provider_synced_at <= reconciliation_started_at
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
        reconciliation_started_at
      ),
      cancel_at_period_end = false,
      reconciliation_closed_at = reconciliation_started_at,
      status_observed_at = greatest(
        subscription.status_observed_at,
        reconciliation_started_at
      )
    where subscription.provider = 'stripe'::billing_provider
      and subscription.provider_customer_id = p_provider_customer_id
      and not (
        subscription.provider_subscription_id =
          any(p_remote_subscription_ids)
      )
      and subscription.status not in ('canceled', 'incomplete_expired')
      and subscription.created_at <= reconciliation_started_at
      and subscription.provider_synced_at <= reconciliation_started_at
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
      'public.begin_stripe_customer_reconciliation(text)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.close_missing_stripe_customer_subscriptions(text,text[],uuid)',
      'execute'
    )
    and not pg_catalog.has_table_privilege(
      'service_role',
      'public.stripe_customer_reconciliation_tokens',
      'select,insert,update,delete'
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
      'public.begin_stripe_customer_reconciliation(text)',
      'execute'
    )
    and not pg_catalog.has_function_privilege(
      'authenticated',
      'public.close_missing_stripe_customer_subscriptions(text,text[],uuid)',
      'execute'
    )
    and not pg_catalog.has_table_privilege(
      'authenticated',
      'public.stripe_customer_reconciliation_tokens',
      'select,insert,update,delete'
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

revoke all on function public.begin_stripe_customer_reconciliation(text)
from public, anon, authenticated;
grant execute on function public.begin_stripe_customer_reconciliation(text)
to service_role;
revoke all on function public.close_missing_stripe_customer_subscriptions(
  text, text[], uuid
) from public, anon, authenticated;
grant execute on function public.close_missing_stripe_customer_subscriptions(
  text, text[], uuid
) to service_role;
