alter table public.billing_events
  add column if not exists processing_token uuid,
  add column if not exists processing_started_at timestamptz;

alter table public.billing_events
  drop constraint if exists billing_events_processing_claim_state_check;

alter table public.billing_events
  add constraint billing_events_processing_claim_state_check
  check (
    (
      status = 'processing'
      and processing_token is not null
      and processing_started_at is not null
    )
    or (
      status <> 'processing'
      and processing_token is null
      and processing_started_at is null
    )
  );

create or replace function public.begin_billing_event_attempt(
  p_billing_event_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt_count integer;
  v_claim_token uuid;
  v_current_status text;
  v_last_attempted_at timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;

  update public.billing_events as event
  set
    status = 'processing',
    attempt_count = event.attempt_count + 1,
    last_attempted_at = v_last_attempted_at,
    processing_error = null,
    processing_token = gen_random_uuid(),
    processing_started_at = v_last_attempted_at,
    updated_at = v_last_attempted_at
  where event.id = p_billing_event_id
    and event.status <> 'processed'
    and (
      event.status <> 'processing'
      or event.processing_started_at <= v_last_attempted_at - interval '120 seconds'
    )
  returning event.attempt_count, event.processing_token
  into v_attempt_count, v_claim_token;

  if v_claim_token is null then
    select event.status
    into v_current_status
    from public.billing_events as event
    where event.id = p_billing_event_id;

    if v_current_status is null then
      raise exception 'Billing event not found';
    end if;

    return jsonb_build_object(
      'claimed', false,
      'status', v_current_status
    );
  end if;

  return jsonb_build_object(
    'attemptCount', v_attempt_count,
    'claimToken', v_claim_token,
    'claimed', true,
    'lastAttemptedAt', v_last_attempted_at,
    'status', 'processing'
  );
end;
$$;

create or replace function public.finish_billing_event_attempt(
  p_billing_event_id uuid,
  p_claim_token uuid,
  p_succeeded boolean,
  p_error text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_processed_at timestamptz;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;

  update public.billing_events as event
  set
    status = case when p_succeeded then 'processed' else 'failed' end,
    processed_at = case when p_succeeded then clock_timestamp() else null end,
    processing_error = case
      when p_succeeded then null
      else left(coalesce(nullif(p_error, ''), 'webhook_processing_failed'), 1000)
    end,
    processing_token = null,
    processing_started_at = null,
    updated_at = clock_timestamp()
  where event.id = p_billing_event_id
    and event.status = 'processing'
    and p_claim_token is not null
    and event.processing_token = p_claim_token
  returning event.status, event.processed_at
  into v_status, v_processed_at;

  if v_status is null then
    return jsonb_build_object('settled', false);
  end if;

  return jsonb_build_object(
    'processedAt', v_processed_at,
    'settled', true,
    'status', v_status
  );
end;
$$;

create or replace function public.service_role_readiness()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.role() = 'service_role', false)
    and pg_catalog.has_table_privilege('service_role', 'public.content_items', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.content_access_rules', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.products', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.product_assets', 'select')
    and pg_catalog.has_table_privilege(
      'service_role',
      'public.product_asset_cleanup_jobs',
      'select,update'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.claim_product_asset_cleanup_jobs(integer,uuid)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.record_product_asset_cleanup_attempt(uuid,boolean,text,uuid)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.begin_billing_event_attempt(uuid)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.finish_billing_event_attempt(uuid,uuid,boolean,text)',
      'execute'
    )
    and pg_catalog.has_table_privilege('service_role', 'public.office_hour_sessions', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.billing_events', 'select,insert,update');
$$;

revoke all on function public.finish_billing_event_attempt(
  uuid, uuid, boolean, text
) from public, anon, authenticated;
grant execute on function public.finish_billing_event_attempt(
  uuid, uuid, boolean, text
) to service_role;

revoke all on function public.service_role_readiness() from public, anon, authenticated;
grant execute on function public.service_role_readiness() to service_role;
