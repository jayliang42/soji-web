alter table public.products
add column if not exists updated_at timestamptz not null default now();

alter table public.products
add column if not exists revision bigint not null default 1;

alter table public.products
drop constraint if exists products_revision_positive;
alter table public.products
add constraint products_revision_positive check (revision > 0);

create or replace function public.track_product_revision()
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

drop trigger if exists products_track_revision on public.products;
create trigger products_track_revision
before update on public.products
for each row execute function public.track_product_revision();

create or replace function public.upsert_product(
  p_product_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_price_cents integer,
  p_price_label text,
  p_bullets text[],
  p_stripe_price_id text,
  p_entitlement_id text,
  p_is_active boolean,
  p_expected_revision bigint default null
)
returns table (id uuid, slug text, revision bigint)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  saved_id uuid;
  saved_slug text;
  saved_revision bigint;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if p_product_id is null then
    insert into public.products (
      slug,
      title,
      summary,
      price_cents,
      price_label,
      bullets,
      stripe_price_id,
      entitlement_id,
      is_active
    ) values (
      p_slug,
      p_title,
      p_summary,
      p_price_cents,
      p_price_label,
      coalesce(p_bullets, '{}'::text[]),
      nullif(p_stripe_price_id, ''),
      p_entitlement_id,
      p_is_active
    )
    returning products.id, products.slug, products.revision
    into saved_id, saved_slug, saved_revision;
  else
    if p_expected_revision is null or p_expected_revision < 1 then
      raise exception 'expected_product_revision_required' using errcode = '22023';
    end if;

    update public.products
    set
      slug = p_slug,
      title = p_title,
      summary = p_summary,
      price_cents = p_price_cents,
      price_label = p_price_label,
      bullets = coalesce(p_bullets, '{}'::text[]),
      stripe_price_id = nullif(p_stripe_price_id, ''),
      entitlement_id = p_entitlement_id,
      is_active = p_is_active
    where products.id = p_product_id
      and products.revision = p_expected_revision
    returning products.id, products.slug, products.revision
    into saved_id, saved_slug, saved_revision;

    if saved_id is null then
      if exists (
        select 1
        from public.products as existing_product
        where existing_product.id = p_product_id
      ) then
        raise exception 'product_write_conflict' using errcode = '40001';
      end if;
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;
  end if;

  return query select saved_id, saved_slug, saved_revision;
end;
$$;

create or replace function public.archive_product(
  p_product_id uuid,
  p_expected_revision bigint
)
returns table (id uuid, slug text, revision bigint)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  saved_id uuid;
  saved_slug text;
  saved_revision bigint;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'expected_product_revision_required' using errcode = '22023';
  end if;

  update public.products
  set is_active = false
  where products.id = p_product_id
    and products.revision = p_expected_revision
  returning products.id, products.slug, products.revision
  into saved_id, saved_slug, saved_revision;

  if saved_id is null then
    if exists (
      select 1
      from public.products as existing_product
      where existing_product.id = p_product_id
    ) then
      raise exception 'product_archive_conflict' using errcode = '40001';
    end if;
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  return query select saved_id, saved_slug, saved_revision;
end;
$$;

revoke insert, update, delete on table public.products from authenticated;

revoke all on function public.upsert_product(
  uuid, text, text, text, integer, text, text[], text, text, boolean, bigint
) from public;
grant execute on function public.upsert_product(
  uuid, text, text, text, integer, text, text[], text, text, boolean, bigint
) to authenticated;

revoke all on function public.archive_product(uuid, bigint) from public;
grant execute on function public.archive_product(uuid, bigint) to authenticated;
