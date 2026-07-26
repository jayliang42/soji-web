alter table public.product_asset_cleanup_jobs
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz;

alter table public.product_asset_cleanup_jobs
  drop constraint if exists product_asset_cleanup_jobs_status_check;
alter table public.product_asset_cleanup_jobs
  add constraint product_asset_cleanup_jobs_status_check
  check (status in ('pending', 'processing', 'failed', 'processed'));

alter table public.product_asset_cleanup_jobs
  add constraint product_asset_cleanup_jobs_claim_state_check
  check (
    (status = 'processing' and claim_token is not null and claimed_at is not null)
    or (status <> 'processing' and claim_token is null and claimed_at is null)
  );

create function public.normalize_product_asset_cleanup_claim()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'processing' then
    new.claim_token := null;
    new.claimed_at := null;
  end if;
  return new;
end;
$$;

create trigger product_asset_cleanup_jobs_normalize_claim
before insert or update of status, claim_token, claimed_at
on public.product_asset_cleanup_jobs
for each row execute function public.normalize_product_asset_cleanup_claim();

create index if not exists product_asset_cleanup_jobs_lease_idx
on public.product_asset_cleanup_jobs (claimed_at, created_at)
where status = 'processing';

create function public.claim_product_asset_cleanup_jobs(
  p_limit integer default 20,
  p_cleanup_job_id uuid default null
)
returns table (
  id uuid,
  product_id uuid,
  storage_path text,
  claim_token uuid
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
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'invalid_product_asset_cleanup_claim_limit' using errcode = '22023';
  end if;
  if not caller_is_service then
    if caller_user_id is null then
      raise exception 'cleanup_claim_role_required' using errcode = '42501';
    end if;
    if p_cleanup_job_id is null and not public.has_role('admin'::public.user_role) then
      raise exception 'admin_role_required' using errcode = '42501';
    end if;
    if p_cleanup_job_id is not null and not public.is_editor_or_admin() then
      raise exception 'publisher_role_required' using errcode = '42501';
    end if;
  end if;

  return query
  with candidates as (
    select job.id
    from public.product_asset_cleanup_jobs as job
    where (
      p_cleanup_job_id is null
      and (
        (job.status in ('pending', 'failed') and job.not_before <= clock_timestamp())
        or (
          job.status = 'processing'
          and coalesce(job.claimed_at, '-infinity'::timestamptz)
            <= clock_timestamp() - interval '120 seconds'
        )
      )
    ) or (
      p_cleanup_job_id is not null
      and job.id = p_cleanup_job_id
      and (
        job.status in ('pending', 'failed')
        or (
          job.status = 'processing'
          and coalesce(job.claimed_at, '-infinity'::timestamptz)
            <= clock_timestamp() - interval '120 seconds'
        )
      )
    )
    order by job.not_before, job.created_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.product_asset_cleanup_jobs as job
    set
      status = 'processing',
      claim_token = gen_random_uuid(),
      claimed_at = clock_timestamp(),
      updated_at = clock_timestamp()
    from candidates
    where job.id = candidates.id
    returning job.id, job.product_id, job.storage_path, job.claim_token
  )
  select claimed.id, claimed.product_id, claimed.storage_path, claimed.claim_token
  from claimed;
end;
$$;

drop function public.record_product_asset_cleanup_attempt(uuid, boolean, text);

create function public.record_product_asset_cleanup_attempt(
  p_cleanup_job_id uuid,
  p_succeeded boolean,
  p_error text default null,
  p_claim_token uuid default null
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
  if p_succeeded is null then
    raise exception 'cleanup_attempt_result_required' using errcode = '22023';
  end if;
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
    claim_token = null,
    claimed_at = null,
    updated_at = clock_timestamp()
  where job.id = p_cleanup_job_id
    and job.status = 'processing'
    and p_claim_token is not null
    and job.claim_token = p_claim_token
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
      'public.claim_product_asset_cleanup_jobs(integer,uuid)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.record_product_asset_cleanup_attempt(uuid,boolean,text,uuid)',
      'execute'
    )
    and pg_catalog.has_table_privilege('service_role', 'public.office_hour_sessions', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.billing_events', 'select,insert,update');
$$;

revoke all on function public.claim_product_asset_cleanup_jobs(
  integer, uuid
) from public, anon;
grant execute on function public.claim_product_asset_cleanup_jobs(
  integer, uuid
) to authenticated, service_role;

revoke all on function public.normalize_product_asset_cleanup_claim() from public;

revoke all on function public.record_product_asset_cleanup_attempt(
  uuid, boolean, text, uuid
) from public, anon;
grant execute on function public.record_product_asset_cleanup_attempt(
  uuid, boolean, text, uuid
) to authenticated, service_role;

revoke all on function public.service_role_readiness() from public, anon, authenticated;
grant execute on function public.service_role_readiness() to service_role;
