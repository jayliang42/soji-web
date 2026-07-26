create or replace function public.record_product_asset_cleanup_attempt(
  p_cleanup_job_id uuid,
  p_succeeded boolean,
  p_error text default null
)
returns table (
  id uuid,
  status text,
  attempt_count integer,
  processed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  caller_is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if not caller_is_service
    and (caller_user_id is null or not public.is_editor_or_admin())
  then
    raise exception 'publisher_or_service_role_required' using errcode = '42501';
  end if;

  return query
  update public.product_asset_cleanup_jobs as job
  set
    status = case when p_succeeded then 'processed' else 'failed' end,
    attempt_count = job.attempt_count + 1,
    last_attempted_at = clock_timestamp(),
    last_error = case
      when p_succeeded then null
      else left(coalesce(nullif(p_error, ''), 'storage_cleanup_failed'), 1000)
    end,
    processed_at = case when p_succeeded then clock_timestamp() else null end,
    updated_at = clock_timestamp()
  where job.id = p_cleanup_job_id
    and job.status <> 'processed'
  returning job.id, job.status, job.attempt_count, job.processed_at;
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
      'public.record_product_asset_cleanup_attempt(uuid,boolean,text)',
      'execute'
    )
    and pg_catalog.has_table_privilege('service_role', 'public.office_hour_sessions', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.billing_events', 'select,insert,update');
$$;

revoke all on function public.record_product_asset_cleanup_attempt(
  uuid, boolean, text
) from public, anon;
grant execute on function public.record_product_asset_cleanup_attempt(
  uuid, boolean, text
) to authenticated, service_role;

revoke all on function public.service_role_readiness() from public, anon, authenticated;
grant execute on function public.service_role_readiness() to service_role;
