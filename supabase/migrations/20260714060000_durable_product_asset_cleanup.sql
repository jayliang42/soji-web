create table if not exists public.product_asset_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  storage_path text not null unique,
  reason text not null check (
    reason in ('abandoned_upload', 'replaced_asset', 'deleted_asset')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'failed', 'processed')
  ),
  not_before timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempted_at timestamptz,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_asset_cleanup_jobs_due_idx
on public.product_asset_cleanup_jobs (not_before, created_at)
where status in ('pending', 'failed');

alter table public.product_asset_cleanup_jobs enable row level security;

drop policy if exists "product_asset_cleanup_jobs_select_admin"
on public.product_asset_cleanup_jobs;
create policy "product_asset_cleanup_jobs_select_admin"
on public.product_asset_cleanup_jobs for select
using (public.has_role('admin'::public.user_role));

create or replace function public.prepare_product_asset_upload(
  p_product_id uuid,
  p_storage_path text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  cleanup_job_id uuid;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products where products.id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;
  if p_storage_path is null
    or p_storage_path !~ ('^' || p_product_id::text || '/[0-9a-f-]+\.[a-z0-9]+$')
  then
    raise exception 'invalid_product_asset_storage_path' using errcode = '22023';
  end if;

  insert into public.product_asset_cleanup_jobs (
    product_id,
    storage_path,
    reason,
    not_before
  ) values (
    p_product_id,
    p_storage_path,
    'abandoned_upload',
    clock_timestamp() + interval '15 minutes'
  )
  returning product_asset_cleanup_jobs.id into cleanup_job_id;

  return cleanup_job_id;
end;
$$;

drop function if exists public.replace_product_asset(
  uuid, text, text, text, bigint, bigint
);

create function public.replace_product_asset(
  p_product_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_content_type text,
  p_size_bytes bigint,
  p_upload_cleanup_job_id uuid,
  p_expected_revision bigint default null
)
returns table (
  id uuid,
  original_filename text,
  size_bytes bigint,
  revision bigint,
  previous_storage_path text,
  cleanup_job_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  existing_asset_id uuid;
  existing_revision bigint;
  existing_storage_path text;
  prepared_job_id uuid;
  saved_id uuid;
  saved_filename text;
  saved_size bigint;
  saved_revision bigint;
  old_file_cleanup_job_id uuid;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  select job.id
  into prepared_job_id
  from public.product_asset_cleanup_jobs as job
  where job.id = p_upload_cleanup_job_id
    and job.product_id = p_product_id
    and job.storage_path = p_storage_path
    and job.reason = 'abandoned_upload'
    and job.status = 'pending'
  for update;

  if prepared_job_id is null then
    raise exception 'product_asset_upload_not_prepared' using errcode = '22023';
  end if;

  select asset.id, asset.storage_path, asset.revision
  into existing_asset_id, existing_storage_path, existing_revision
  from public.product_assets as asset
  where asset.product_id = p_product_id
  for update;

  if existing_asset_id is null then
    if p_expected_revision is not null then
      raise exception 'product_asset_not_found' using errcode = 'P0002';
    end if;

    insert into public.product_assets (
      product_id,
      storage_path,
      original_filename,
      content_type,
      size_bytes,
      created_by
    ) values (
      p_product_id,
      p_storage_path,
      p_original_filename,
      p_content_type,
      p_size_bytes,
      caller_user_id
    )
    returning product_assets.id, product_assets.original_filename,
      product_assets.size_bytes, product_assets.revision
    into saved_id, saved_filename, saved_size, saved_revision;
  else
    if p_expected_revision is null or p_expected_revision <> existing_revision then
      raise exception 'product_asset_write_conflict' using errcode = '40001';
    end if;

    update public.product_assets as asset
    set
      storage_path = p_storage_path,
      original_filename = p_original_filename,
      content_type = p_content_type,
      size_bytes = p_size_bytes,
      created_by = caller_user_id
    where asset.id = existing_asset_id
    returning asset.id, asset.original_filename, asset.size_bytes, asset.revision
    into saved_id, saved_filename, saved_size, saved_revision;
  end if;

  update public.product_asset_cleanup_jobs as job
  set
    status = 'processed',
    processed_at = clock_timestamp(),
    updated_at = clock_timestamp()
  where job.id = prepared_job_id;

  if existing_storage_path is not null then
    insert into public.product_asset_cleanup_jobs (
      product_id,
      storage_path,
      reason
    ) values (
      p_product_id,
      existing_storage_path,
      'replaced_asset'
    )
    on conflict on constraint product_asset_cleanup_jobs_storage_path_key do update
    set
      product_id = excluded.product_id,
      reason = excluded.reason,
      status = 'pending',
      not_before = clock_timestamp(),
      attempt_count = 0,
      last_attempted_at = null,
      last_error = null,
      processed_at = null,
      updated_at = clock_timestamp()
    returning product_asset_cleanup_jobs.id into old_file_cleanup_job_id;
  end if;

  return query
  select saved_id, saved_filename, saved_size, saved_revision,
    existing_storage_path, old_file_cleanup_job_id;
end;
$$;

drop function if exists public.delete_product_asset(uuid, bigint);

create function public.delete_product_asset(
  p_product_id uuid,
  p_expected_revision bigint
)
returns table (storage_path text, cleanup_job_id uuid)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  existing_asset_id uuid;
  existing_revision bigint;
  existing_storage_path text;
  saved_cleanup_job_id uuid;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'expected_product_asset_revision_required' using errcode = '22023';
  end if;

  select asset.id, asset.storage_path, asset.revision
  into existing_asset_id, existing_storage_path, existing_revision
  from public.product_assets as asset
  where asset.product_id = p_product_id
  for update;

  if existing_asset_id is null then
    raise exception 'product_asset_not_found' using errcode = 'P0002';
  end if;
  if existing_revision <> p_expected_revision then
    raise exception 'product_asset_delete_conflict' using errcode = '40001';
  end if;

  insert into public.product_asset_cleanup_jobs (
    product_id,
    storage_path,
    reason
  ) values (
    p_product_id,
    existing_storage_path,
    'deleted_asset'
  )
  on conflict on constraint product_asset_cleanup_jobs_storage_path_key do update
  set
    product_id = excluded.product_id,
    reason = excluded.reason,
    status = 'pending',
    not_before = clock_timestamp(),
    attempt_count = 0,
    last_attempted_at = null,
    last_error = null,
    processed_at = null,
    updated_at = clock_timestamp()
  returning product_asset_cleanup_jobs.id into saved_cleanup_job_id;

  delete from public.product_assets as asset where asset.id = existing_asset_id;
  return query select existing_storage_path, saved_cleanup_job_id;
end;
$$;

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
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
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

grant select on table public.product_asset_cleanup_jobs to authenticated;
revoke insert, update, delete on table public.product_asset_cleanup_jobs from authenticated;

revoke all on function public.prepare_product_asset_upload(uuid, text) from public;
grant execute on function public.prepare_product_asset_upload(uuid, text) to authenticated;

revoke all on function public.replace_product_asset(
  uuid, text, text, text, bigint, uuid, bigint
) from public;
grant execute on function public.replace_product_asset(
  uuid, text, text, text, bigint, uuid, bigint
) to authenticated;

revoke all on function public.delete_product_asset(uuid, bigint) from public;
grant execute on function public.delete_product_asset(uuid, bigint) to authenticated;

revoke all on function public.record_product_asset_cleanup_attempt(
  uuid, boolean, text
) from public;
grant execute on function public.record_product_asset_cleanup_attempt(
  uuid, boolean, text
) to authenticated;
