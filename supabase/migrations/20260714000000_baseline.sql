create extension if not exists "pgcrypto";

do $$ begin
  create type membership_tier as enum ('free', 'tier_1', 'tier_2', 'tier_3');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type user_role as enum ('member', 'editor', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type content_type as enum (
    'article',
    'case_study',
    'template',
    'monthly_update',
    'product',
    'office_hour_session'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type visibility as enum ('public', 'members_only', 'purchase_required');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type billing_provider as enum ('stripe', 'app_store', 'play_store');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  tier membership_tier not null default 'free',
  timezone text default 'America/Chicago',
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references profiles (id) on delete cascade,
  role user_role not null,
  primary key (user_id, role)
);

create table if not exists membership_plans (
  id membership_tier primary key,
  name text not null,
  monthly_price integer not null,
  stripe_lookup_key text,
  revenuecat_entitlement text,
  description text not null
);

create table if not exists entitlements (
  id text primary key,
  label text not null,
  description text not null
);

create table if not exists plan_entitlements (
  plan_id membership_tier not null references membership_plans (id) on delete cascade,
  entitlement_id text not null references entitlements (id) on delete cascade,
  primary key (plan_id, entitlement_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  provider billing_provider not null,
  provider_customer_id text,
  provider_subscription_id text not null unique,
  plan_id membership_tier not null references membership_plans (id),
  status text not null,
  current_period_ends_at timestamptz,
  cancelled_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);

alter table subscriptions
add column if not exists cancel_at_period_end boolean not null default false;

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  provider billing_provider not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempted_at timestamptz,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table billing_events
add column if not exists attempt_count integer not null default 0;
alter table billing_events
add column if not exists last_attempted_at timestamptz;
alter table billing_events
drop constraint if exists billing_events_attempt_count_nonnegative;
alter table billing_events
add constraint billing_events_attempt_count_nonnegative check (attempt_count >= 0);

create table if not exists user_entitlements (
  user_id uuid not null references profiles (id) on delete cascade,
  entitlement_id text not null references entitlements (id) on delete cascade,
  source_type text not null,
  source_id text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  primary key (user_id, entitlement_id, source_type, source_id)
);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  type content_type not null,
  visibility visibility not null default 'members_only',
  body_markdown text not null,
  cover_image_url text,
  published_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists content_access_rules (
  content_id uuid not null references content_items (id) on delete cascade,
  entitlement_id text not null references entitlements (id) on delete cascade,
  primary key (content_id, entitlement_id)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  price_cents integer not null default 0,
  price_label text not null default 'Set in Stripe',
  bullets text[] not null default '{}'::text[],
  stripe_price_id text,
  entitlement_id text references entitlements (id),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table products add column if not exists price_cents integer not null default 0;
alter table products add column if not exists price_label text not null default 'Set in Stripe';
alter table products add column if not exists bullets text[] not null default '{}'::text[];
alter table products alter column is_active set default false;

-- Dynamic SQL defers relation lookup when Supabase sends this file as one batch.
-- A product cannot be sold unless checkout and fulfillment are both configured.
do $$ begin
  execute $sql$
    update products
    set is_active = false
    where is_active
      and (
        stripe_price_id is null
        or stripe_price_id !~ '^price_[A-Za-z0-9]+$'
        or entitlement_id is null
      )
  $sql$;
end $$;

alter table products drop constraint if exists products_active_checkout_configured;
alter table products add constraint products_active_checkout_configured check (
  not is_active
  or (
    coalesce(stripe_price_id ~ '^price_[A-Za-z0-9]+$', false)
    and entitlement_id is not null
  )
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id),
  provider billing_provider not null,
  provider_payment_id text not null unique,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists product_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products (id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table product_assets drop constraint if exists product_assets_product_id_fkey;
alter table product_assets add constraint product_assets_product_id_fkey
foreign key (product_id) references products (id) on delete restrict;

create table if not exists office_hour_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  signup_url text not null,
  replay_url text,
  required_entitlement_id text references entitlements (id),
  created_at timestamptz not null default now()
);

create table if not exists checkout_rate_limits (
  user_id uuid not null,
  action text not null check (action in ('product', 'subscription')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, action)
);

create table if not exists role_change_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid not null,
  previous_role user_role not null,
  assigned_role user_role not null,
  created_at timestamptz not null default now()
);

create or replace function public.enforce_active_product_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active and not exists (
    select 1 from public.product_assets where product_id = new.id
  ) then
    raise exception 'product_delivery_not_configured' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists products_require_delivery_before_activation on products;
create trigger products_require_delivery_before_activation
before insert or update of is_active on products
for each row execute function public.enforce_active_product_delivery();

create or replace function public.deactivate_product_before_asset_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set is_active = false where id = old.product_id;
  return old;
end;
$$;

drop trigger if exists product_assets_deactivate_product on product_assets;
create trigger product_assets_deactivate_product
before delete on product_assets
for each row execute function public.deactivate_product_before_asset_delete();

-- Existing products must fail closed until a private delivery asset is configured.
do $$ begin
  execute $sql$
    update products
    set is_active = false
    where is_active
      and not exists (
        select 1 from product_assets where product_assets.product_id = products.id
      )
  $sql$;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-files',
  'product-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.has_role(required_role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('editor'::user_role)
    or public.has_role('admin'::user_role);
$$;

create or replace function public.profile_tier_unchanged(
  profile_id uuid,
  requested_tier membership_tier
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and id = profile_id
      and tier = requested_tier
  );
$$;

create or replace function public.consume_checkout_rate_limit(p_action text)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_time timestamptz := clock_timestamp();
  request_limit constant integer := 5;
  window_duration constant interval := interval '10 minutes';
  current_count integer;
  current_window_started_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_action not in ('product', 'subscription') then
    raise exception 'invalid_rate_limit_action' using errcode = '22023';
  end if;

  insert into public.checkout_rate_limits (
    user_id,
    action,
    window_started_at,
    request_count
  )
  values (current_user_id, p_action, request_time, 1)
  on conflict (user_id, action) do update
  set
    request_count = case
      when checkout_rate_limits.window_started_at <= request_time - window_duration
        then 1
      else checkout_rate_limits.request_count + 1
    end,
    window_started_at = case
      when checkout_rate_limits.window_started_at <= request_time - window_duration
        then request_time
      else checkout_rate_limits.window_started_at
    end
  returning request_count, window_started_at
  into current_count, current_window_started_at;

  return query select
    current_count <= request_limit,
    greatest(request_limit - current_count, 0),
    current_window_started_at + window_duration;
end;
$$;

create or replace function public.set_user_access_role(
  p_target_user_id uuid,
  p_access_role user_role
)
returns table (
  previous_role user_role,
  assigned_role user_role,
  changed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  previous_access_role user_role;
  event_created_at timestamptz := clock_timestamp();
begin
  if caller_user_id is null then
    raise exception 'admin_role_required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('soji.admin-role-change', 0));

  if not public.has_role('admin'::user_role) then
    raise exception 'admin_role_required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_target_user_id
  ) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  select case
    when exists (
      select 1 from public.user_roles
      where user_id = p_target_user_id and role = 'admin'::user_role
    ) then 'admin'::user_role
    when exists (
      select 1 from public.user_roles
      where user_id = p_target_user_id and role = 'editor'::user_role
    ) then 'editor'::user_role
    else 'member'::user_role
  end
  into previous_access_role;

  if previous_access_role = 'admin'::user_role
    and p_access_role <> 'admin'::user_role
    and (
      select count(*) from public.user_roles where role = 'admin'::user_role
    ) <= 1
  then
    raise exception 'last_admin_required' using errcode = '23514';
  end if;

  insert into public.user_roles (user_id, role)
  values (p_target_user_id, 'member'::user_role)
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_id = p_target_user_id
    and role in ('editor'::user_role, 'admin'::user_role);

  if p_access_role <> 'member'::user_role then
    insert into public.user_roles (user_id, role)
    values (p_target_user_id, p_access_role)
    on conflict (user_id, role) do nothing;
  end if;

  insert into public.role_change_events (
    actor_user_id,
    target_user_id,
    previous_role,
    assigned_role,
    created_at
  ) values (
    caller_user_id,
    p_target_user_id,
    previous_access_role,
    p_access_role,
    event_created_at
  );

  return query select previous_access_role, p_access_role, event_created_at;
end;
$$;

create or replace function public.list_managed_users(
  p_query text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_query text := left(btrim(coalesce(p_query, '')), 100);
  bounded_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  bounded_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or not public.has_role('admin'::user_role) then
    raise exception 'admin_role_required' using errcode = '42501';
  end if;

  return (
    with filtered_profiles as (
      select p.id, p.email, p.full_name, p.tier, p.created_at
      from public.profiles p
      where normalized_query = ''
        or p.email ilike '%' || normalized_query || '%'
        or coalesce(p.full_name, '') ilike '%' || normalized_query || '%'
    ),
    page_rows as (
      select
        p.id,
        p.email,
        p.full_name,
        p.tier,
        p.created_at,
        coalesce(r.roles, array['member'::user_role]) as roles,
        case
          when 'admin'::user_role = any(coalesce(r.roles, array[]::user_role[]))
            then 'admin'::user_role
          when 'editor'::user_role = any(coalesce(r.roles, array[]::user_role[]))
            then 'editor'::user_role
          else 'member'::user_role
        end as access_role
      from filtered_profiles p
      left join lateral (
        select array_agg(ur.role order by ur.role::text) as roles
        from public.user_roles ur
        where ur.user_id = p.id
      ) r on true
      order by p.created_at desc, p.id desc
      limit bounded_limit
      offset bounded_offset
    )
    select jsonb_build_object(
      'items', coalesce(
        (
          select jsonb_agg(
            to_jsonb(page_rows)
            order by page_rows.created_at desc, page_rows.id desc
          )
          from page_rows
        ),
        '[]'::jsonb
      ),
      'total_items', (select count(*) from filtered_profiles)
    )
  );
end;
$$;

create or replace function public.upsert_content_item(
  p_content_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_type content_type,
  p_visibility visibility,
  p_body_markdown text,
  p_cover_image_url text,
  p_published boolean,
  p_required_entitlements text[]
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
    update public.content_items
    set
      slug = p_slug,
      title = p_title,
      summary = p_summary,
      type = p_type,
      visibility = p_visibility,
      body_markdown = p_body_markdown,
      cover_image_url = nullif(p_cover_image_url, ''),
      published_at = case when p_published then clock_timestamp() else null end
    where content_items.id = p_content_id
    returning content_items.id, content_items.slug into saved_id, saved_slug;

    if saved_id is null then
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

create or replace function public.delete_content_item(p_content_id uuid)
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

  delete from public.content_items where id = p_content_id;
  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    raise exception 'content_not_found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

drop function if exists public.sync_stripe_subscription_state(
  uuid, text, text, membership_tier, text, timestamptz, timestamptz, timestamptz
);
create or replace function public.sync_stripe_subscription_state(
  p_user_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_plan_id membership_tier,
  p_status text,
  p_current_period_ends_at timestamptz default null,
  p_cancelled_at timestamptz default null,
  p_observed_at timestamptz default clock_timestamp(),
  p_cancel_at_period_end boolean default false
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
  existing_user_id uuid;
begin
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select s.user_id
  into existing_user_id
  from public.subscriptions s
  where s.provider_subscription_id = p_provider_subscription_id;

  if existing_user_id is not null and existing_user_id <> p_user_id then
    raise exception 'subscription_ownership_conflict' using errcode = '23505';
  end if;

  insert into public.subscriptions (
    user_id,
    provider,
    provider_customer_id,
    provider_subscription_id,
    plan_id,
    status,
    current_period_ends_at,
    cancelled_at,
    cancel_at_period_end
  ) values (
    p_user_id,
    'stripe'::billing_provider,
    p_provider_customer_id,
    p_provider_subscription_id,
    p_plan_id,
    p_status,
    p_current_period_ends_at,
    p_cancelled_at,
    p_cancel_at_period_end
  )
  on conflict (provider_subscription_id) do update
  set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_ends_at = excluded.current_period_ends_at,
    cancelled_at = excluded.cancelled_at,
    cancel_at_period_end = excluded.cancel_at_period_end;

  update public.user_entitlements
  set ends_at = p_observed_at
  where user_id = p_user_id
    and source_type = 'subscription'
    and source_id = p_provider_subscription_id;

  if p_status in ('active', 'trialing') then
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
      pe.entitlement_id,
      'subscription',
      p_provider_subscription_id,
      p_observed_at,
      p_current_period_ends_at
    from public.plan_entitlements pe
    where pe.plan_id = p_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = excluded.ends_at;
  end if;

  select case coalesce(max(
    case s.plan_id
      when 'tier_3'::membership_tier then 3
      when 'tier_2'::membership_tier then 2
      when 'tier_1'::membership_tier then 1
      else 0
    end
  ), 0)
    when 3 then 'tier_3'::membership_tier
    when 2 then 'tier_2'::membership_tier
    when 1 then 'tier_1'::membership_tier
    else 'free'::membership_tier
  end
  into effective_tier
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing');

  update public.profiles
  set tier = effective_tier
  where id = p_user_id;

  return effective_tier;
end;
$$;

create or replace function public.sync_stripe_product_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_provider_payment_id text,
  p_status text,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  product_entitlement_id text;
  existing_user_id uuid;
  existing_product_id uuid;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;

  select p.entitlement_id
  into product_entitlement_id
  from public.products p
  where p.id = p_product_id;

  if product_entitlement_id is null then
    raise exception 'product_entitlement_not_configured' using errcode = '23514';
  end if;

  select p.user_id, p.product_id
  into existing_user_id, existing_product_id
  from public.purchases p
  where p.provider_payment_id = p_provider_payment_id;

  if existing_user_id is not null
    and (existing_user_id <> p_user_id or existing_product_id <> p_product_id)
  then
    raise exception 'payment_ownership_conflict' using errcode = '23505';
  end if;

  insert into public.purchases (
    user_id,
    product_id,
    provider,
    provider_payment_id,
    status
  ) values (
    p_user_id,
    p_product_id,
    'stripe'::billing_provider,
    p_provider_payment_id,
    p_status
  )
  on conflict (provider_payment_id) do update
  set status = excluded.status;

  insert into public.user_entitlements (
    user_id,
    entitlement_id,
    source_type,
    source_id,
    starts_at,
    ends_at
  ) values (
    p_user_id,
    product_entitlement_id,
    'purchase',
    p_provider_payment_id,
    p_observed_at,
    null
  )
  on conflict (user_id, entitlement_id, source_type, source_id) do nothing;

  return product_entitlement_id;
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
    and pg_catalog.has_table_privilege('service_role', 'public.office_hour_sessions', 'select')
    and pg_catalog.has_table_privilege('service_role', 'public.billing_events', 'select,insert,update');
$$;

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
  v_last_attempted_at timestamptz := now();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;

  update public.billing_events as event
  set
    attempt_count = event.attempt_count + 1,
    last_attempted_at = v_last_attempted_at,
    updated_at = v_last_attempted_at
  where event.id = p_billing_event_id
  returning event.attempt_count into v_attempt_count;

  if v_attempt_count is null then
    raise exception 'Billing event not found';
  end if;

  return jsonb_build_object(
    'attemptCount', v_attempt_count,
    'lastAttemptedAt', v_last_attempted_at
  );
end;
$$;

create or replace function public.bootstrap_user_profile()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_email text;
  v_full_name text;
  v_avatar_url text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  v_email := left(coalesce(nullif(btrim(v_claims ->> 'email'), ''), ''), 320);
  v_full_name := left(
    nullif(btrim(coalesce(
      v_claims -> 'user_metadata' ->> 'full_name',
      v_claims -> 'user_metadata' ->> 'name'
    )), ''),
    200
  );
  v_avatar_url := left(
    nullif(btrim(v_claims -> 'user_metadata' ->> 'avatar_url'), ''),
    2048
  );

  insert into public.profiles as existing_profile (id, email, full_name, avatar_url)
  values (v_user_id, v_email, v_full_name, v_avatar_url)
  on conflict (id) do update
  set
    email = case when excluded.email = '' then existing_profile.email else excluded.email end,
    full_name = coalesce(existing_profile.full_name, excluded.full_name),
    avatar_url = coalesce(existing_profile.avatar_url, excluded.avatar_url);

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'member'::public.user_role)
  on conflict (user_id, role) do nothing;

  return v_user_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema public to service_role;
grant usage on type membership_tier, user_role, content_type, visibility, billing_provider
to anon, authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public
grant all privileges on tables to service_role;
alter default privileges in schema public
grant all privileges on sequences to service_role;
alter default privileges in schema public
grant execute on functions to service_role;

grant select on table
  membership_plans,
  entitlements,
  plan_entitlements,
  content_items,
  content_access_rules,
  products
to anon;

grant select on table
  profiles,
  user_roles,
  membership_plans,
  entitlements,
  plan_entitlements,
  subscriptions,
  billing_events,
  user_entitlements,
  content_items,
  content_access_rules,
  products,
  product_assets,
  purchases,
  office_hour_sessions,
  role_change_events
to authenticated;

grant insert, update on table profiles to authenticated;
revoke insert, update, delete on table user_roles from authenticated;
grant insert, update, delete on table
  products,
  product_assets,
  office_hour_sessions
to authenticated;

revoke insert, update, delete on table
  content_items,
  content_access_rules
from authenticated;

revoke all on table public.checkout_rate_limits from anon, authenticated;

revoke all on function public.has_role(user_role) from public;
grant execute on function public.has_role(user_role) to anon, authenticated;
revoke all on function public.is_editor_or_admin() from public;
grant execute on function public.is_editor_or_admin() to anon, authenticated;
revoke all on function public.profile_tier_unchanged(uuid, membership_tier) from public;
grant execute on function public.profile_tier_unchanged(uuid, membership_tier) to authenticated;
revoke all on function public.consume_checkout_rate_limit(text) from public;
grant execute on function public.consume_checkout_rate_limit(text) to authenticated;
revoke all on function public.set_user_access_role(uuid, user_role) from public;
grant execute on function public.set_user_access_role(uuid, user_role) to authenticated;
revoke all on function public.list_managed_users(text, integer, integer) from public;
grant execute on function public.list_managed_users(text, integer, integer) to authenticated;
revoke all on function public.upsert_content_item(
  uuid, text, text, text, content_type, visibility, text, text, boolean, text[]
) from public;
grant execute on function public.upsert_content_item(
  uuid, text, text, text, content_type, visibility, text, text, boolean, text[]
) to authenticated;
revoke all on function public.delete_content_item(uuid) from public;
grant execute on function public.delete_content_item(uuid) to authenticated;
revoke all on function public.service_role_readiness() from public, anon, authenticated;
grant execute on function public.service_role_readiness() to service_role;
revoke all on function public.begin_billing_event_attempt(uuid) from public, anon, authenticated;
grant execute on function public.begin_billing_event_attempt(uuid) to service_role;
revoke all on function public.bootstrap_user_profile() from public, anon;
grant execute on function public.bootstrap_user_profile() to authenticated;
revoke all on function public.sync_stripe_subscription_state(
  uuid, text, text, membership_tier, text, timestamptz, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription_state(
  uuid, text, text, membership_tier, text, timestamptz, timestamptz, timestamptz, boolean
) to service_role;
revoke all on function public.sync_stripe_product_purchase(
  uuid, uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_purchase(
  uuid, uuid, text, text, timestamptz
) to service_role;

alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table membership_plans enable row level security;
alter table entitlements enable row level security;
alter table plan_entitlements enable row level security;
alter table subscriptions enable row level security;
alter table billing_events enable row level security;
alter table user_entitlements enable row level security;
alter table content_items enable row level security;
alter table content_access_rules enable row level security;
alter table products enable row level security;
alter table purchases enable row level security;
alter table product_assets enable row level security;
alter table office_hour_sessions enable row level security;
alter table checkout_rate_limits enable row level security;
alter table role_change_events enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
using (id = auth.uid() or public.has_role('admin'::user_role));

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and public.profile_tier_unchanged(id, tier)
);

drop policy if exists "user_roles_select_own_or_admin" on user_roles;
create policy "user_roles_select_own_or_admin"
on user_roles for select
using (user_id = auth.uid() or public.has_role('admin'::user_role));

drop policy if exists "user_roles_insert_own_member" on user_roles;
drop policy if exists "user_roles_update_own_member" on user_roles;

drop policy if exists "user_roles_admin_all" on user_roles;

drop policy if exists "role_change_events_select_admin" on role_change_events;
create policy "role_change_events_select_admin"
on role_change_events for select
using (public.has_role('admin'::user_role));

drop policy if exists "membership_plans_read_all" on membership_plans;
create policy "membership_plans_read_all"
on membership_plans for select
using (true);

drop policy if exists "entitlements_read_all" on entitlements;
create policy "entitlements_read_all"
on entitlements for select
using (true);

drop policy if exists "plan_entitlements_read_all" on plan_entitlements;
create policy "plan_entitlements_read_all"
on plan_entitlements for select
using (true);

drop policy if exists "subscriptions_select_own_or_admin" on subscriptions;
create policy "subscriptions_select_own_or_admin"
on subscriptions for select
using (user_id = auth.uid() or public.has_role('admin'::user_role));

drop policy if exists "billing_events_select_admin" on billing_events;
create policy "billing_events_select_admin"
on billing_events for select
using (public.has_role('admin'::user_role));

drop policy if exists "user_entitlements_select_own_or_admin" on user_entitlements;
create policy "user_entitlements_select_own_or_admin"
on user_entitlements for select
using (user_id = auth.uid() or public.has_role('admin'::user_role));

drop policy if exists "content_items_select_public_or_admin" on content_items;
create policy "content_items_select_public_or_admin"
on content_items for select
using (
  (published_at is not null and visibility = 'public'::visibility)
  or public.is_editor_or_admin()
);

drop policy if exists "content_items_editor_all" on content_items;
create policy "content_items_editor_all"
on content_items for all
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "content_access_rules_select_public_or_admin" on content_access_rules;
create policy "content_access_rules_select_public_or_admin"
on content_access_rules for select
using (
  public.is_editor_or_admin()
  or exists (
    select 1
    from content_items
    where content_items.id = content_access_rules.content_id
      and content_items.published_at is not null
      and content_items.visibility = 'public'::visibility
  )
);

drop policy if exists "content_access_rules_editor_all" on content_access_rules;
create policy "content_access_rules_editor_all"
on content_access_rules for all
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "products_select_active_or_admin" on products;
create policy "products_select_active_or_admin"
on products for select
using (
  is_active
  or public.is_editor_or_admin()
  or exists (
    select 1
    from public.purchases
    where purchases.product_id = products.id
      and purchases.user_id = auth.uid()
  )
);

drop policy if exists "products_editor_all" on products;
create policy "products_editor_all"
on products for all
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "purchases_select_own_or_admin" on purchases;
create policy "purchases_select_own_or_admin"
on purchases for select
using (user_id = auth.uid() or public.has_role('admin'::user_role));

drop policy if exists "product_assets_select_buyer_or_publisher" on product_assets;
create policy "product_assets_select_buyer_or_publisher"
on product_assets for select
using (
  public.is_editor_or_admin()
  or exists (
    select 1
    from public.purchases
    where purchases.product_id = product_assets.product_id
      and purchases.user_id = auth.uid()
      and purchases.status in ('paid', 'no_payment_required')
  )
);

drop policy if exists "product_assets_editor_insert" on product_assets;
create policy "product_assets_editor_insert"
on product_assets for insert
with check (public.is_editor_or_admin());

drop policy if exists "product_assets_editor_update" on product_assets;
create policy "product_assets_editor_update"
on product_assets for update
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "product_assets_editor_delete" on product_assets;
create policy "product_assets_editor_delete"
on product_assets for delete
using (public.is_editor_or_admin());

drop policy if exists "office_hour_sessions_select_admin" on office_hour_sessions;
create policy "office_hour_sessions_select_admin"
on office_hour_sessions for select
using (public.is_editor_or_admin());

drop policy if exists "office_hour_sessions_editor_all" on office_hour_sessions;
create policy "office_hour_sessions_editor_all"
on office_hour_sessions for all
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "content_media_public_read" on storage.objects;
create policy "content_media_public_read"
on storage.objects for select
using (bucket_id = 'content-media');

drop policy if exists "content_media_editor_insert" on storage.objects;
create policy "content_media_editor_insert"
on storage.objects for insert
with check (
  bucket_id = 'content-media'
  and public.is_editor_or_admin()
);

drop policy if exists "content_media_editor_update" on storage.objects;
create policy "content_media_editor_update"
on storage.objects for update
using (
  bucket_id = 'content-media'
  and public.is_editor_or_admin()
)
with check (
  bucket_id = 'content-media'
  and public.is_editor_or_admin()
);

drop policy if exists "content_media_editor_delete" on storage.objects;
create policy "content_media_editor_delete"
on storage.objects for delete
using (
  bucket_id = 'content-media'
  and public.is_editor_or_admin()
);

drop policy if exists "product_files_editor_select" on storage.objects;
create policy "product_files_editor_select"
on storage.objects for select
using (
  bucket_id = 'product-files'
  and public.is_editor_or_admin()
);

drop policy if exists "product_files_editor_insert" on storage.objects;
create policy "product_files_editor_insert"
on storage.objects for insert
with check (
  bucket_id = 'product-files'
  and public.is_editor_or_admin()
);

drop policy if exists "product_files_editor_update" on storage.objects;
create policy "product_files_editor_update"
on storage.objects for update
using (
  bucket_id = 'product-files'
  and public.is_editor_or_admin()
)
with check (
  bucket_id = 'product-files'
  and public.is_editor_or_admin()
);

drop policy if exists "product_files_editor_delete" on storage.objects;
create policy "product_files_editor_delete"
on storage.objects for delete
using (
  bucket_id = 'product-files'
  and public.is_editor_or_admin()
);
