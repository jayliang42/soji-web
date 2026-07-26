alter table public.content_items
add column if not exists updated_at timestamptz not null default now();

alter table public.content_items
add column if not exists revision bigint not null default 1;

alter table public.content_items
drop constraint if exists content_items_revision_positive;
alter table public.content_items
add constraint content_items_revision_positive check (revision > 0);

drop function if exists public.upsert_content_item(
  uuid, text, text, text, public.content_type, public.visibility,
  text, text, boolean, text[]
);

create function public.upsert_content_item(
  p_content_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_type public.content_type,
  p_visibility public.visibility,
  p_body_markdown text,
  p_cover_image_url text,
  p_published boolean,
  p_required_entitlements text[],
  p_expected_revision bigint default null
)
returns table (id uuid, slug text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  saved_id uuid;
  saved_slug text;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if p_content_id is null then
    insert into public.content_items (
      slug,
      title,
      summary,
      type,
      visibility,
      body_markdown,
      cover_image_url,
      published_at,
      created_by
    )
    values (
      p_slug,
      p_title,
      p_summary,
      p_type,
      p_visibility,
      p_body_markdown,
      nullif(p_cover_image_url, ''),
      case when p_published then clock_timestamp() else null end,
      caller_user_id
    )
    returning content_items.id, content_items.slug into saved_id, saved_slug;
  else
    if p_expected_revision is null or p_expected_revision < 1 then
      raise exception 'expected_content_revision_required' using errcode = '22023';
    end if;

    update public.content_items
    set
      slug = p_slug,
      title = p_title,
      summary = p_summary,
      type = p_type,
      visibility = p_visibility,
      body_markdown = p_body_markdown,
      cover_image_url = nullif(p_cover_image_url, ''),
      published_at = case
        when p_published and content_items.published_at is null then clock_timestamp()
        when p_published then content_items.published_at
        else null
      end,
      updated_at = clock_timestamp(),
      revision = content_items.revision + 1
    where content_items.id = p_content_id
      and content_items.revision = p_expected_revision
    returning content_items.id, content_items.slug into saved_id, saved_slug;

    if saved_id is null then
      if exists (
        select 1
        from public.content_items as existing_item
        where existing_item.id = p_content_id
      ) then
        raise exception 'content_write_conflict' using errcode = '40001';
      end if;
      raise exception 'content_not_found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.content_access_rules
  where content_id = saved_id;

  insert into public.content_access_rules (content_id, entitlement_id)
  select saved_id, requested.entitlement_id
  from (
    select distinct entitlement_id
    from unnest(coalesce(p_required_entitlements, '{}'::text[]))
      as entitlement_list(entitlement_id)
  ) as requested;

  return query select saved_id, saved_slug;
end;
$$;

revoke all on function public.upsert_content_item(
  uuid, text, text, text, public.content_type, public.visibility,
  text, text, boolean, text[], bigint
) from public;
grant execute on function public.upsert_content_item(
  uuid, text, text, text, public.content_type, public.visibility,
  text, text, boolean, text[], bigint
) to authenticated;

drop function if exists public.delete_content_item(uuid);

create function public.delete_content_item(
  p_content_id uuid,
  p_expected_revision bigint
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  deleted_count integer;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'expected_content_revision_required' using errcode = '22023';
  end if;

  delete from public.content_items as deleted_item
  where deleted_item.id = p_content_id
    and deleted_item.revision = p_expected_revision;
  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    if exists (
      select 1
      from public.content_items as existing_item
      where existing_item.id = p_content_id
    ) then
      raise exception 'content_delete_conflict' using errcode = '40001';
    end if;
    raise exception 'content_not_found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_content_item(uuid, bigint) from public;
grant execute on function public.delete_content_item(uuid, bigint) to authenticated;
