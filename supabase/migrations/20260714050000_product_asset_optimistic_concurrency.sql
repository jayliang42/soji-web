alter table public.product_assets
add column if not exists revision bigint not null default 1;

alter table public.product_assets
drop constraint if exists product_assets_revision_positive;
alter table public.product_assets
add constraint product_assets_revision_positive check (revision > 0);

create or replace function public.track_product_asset_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := clock_timestamp();
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists product_assets_track_revision on public.product_assets;
create trigger product_assets_track_revision
before update on public.product_assets
for each row execute function public.track_product_asset_revision();

create or replace function public.replace_product_asset(
  p_product_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_content_type text,
  p_size_bytes bigint,
  p_expected_revision bigint default null
)
returns table (
  id uuid,
  original_filename text,
  size_bytes bigint,
  revision bigint,
  previous_storage_path text
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
  saved_id uuid;
  saved_filename text;
  saved_size bigint;
  saved_revision bigint;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.products where products.id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
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

  return query
  select saved_id, saved_filename, saved_size, saved_revision, existing_storage_path;
end;
$$;

create or replace function public.delete_product_asset(
  p_product_id uuid,
  p_expected_revision bigint
)
returns table (storage_path text)
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

  delete from public.product_assets as asset where asset.id = existing_asset_id;
  return query select existing_storage_path;
end;
$$;

revoke insert, update, delete on table public.product_assets from authenticated;

drop policy if exists "product_assets_editor_insert" on public.product_assets;
drop policy if exists "product_assets_editor_update" on public.product_assets;
drop policy if exists "product_assets_editor_delete" on public.product_assets;

revoke all on function public.replace_product_asset(
  uuid, text, text, text, bigint, bigint
) from public;
grant execute on function public.replace_product_asset(
  uuid, text, text, text, bigint, bigint
) to authenticated;

revoke all on function public.delete_product_asset(uuid, bigint) from public;
grant execute on function public.delete_product_asset(uuid, bigint) to authenticated;
