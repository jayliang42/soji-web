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

alter table profiles
drop constraint if exists profiles_email_canonical_check;
alter table profiles
add constraint profiles_email_canonical_check check (
  email <> ''
  and email = lower(btrim(email))
  and length(email) <= 320
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
  latest_paid_provider_payment_id text,
  latest_paid_observed_at timestamptz,
  provider_synced_at timestamptz not null default now(),
  reconciliation_closed_at timestamptz,
  status_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table subscriptions
add column if not exists cancel_at_period_end boolean not null default false;
alter table subscriptions add column if not exists status_observed_at timestamptz;
update subscriptions
set status_observed_at = created_at
where status_observed_at is null;
alter table subscriptions alter column status_observed_at set default now();
alter table subscriptions alter column status_observed_at set not null;
alter table subscriptions
add column if not exists latest_paid_provider_payment_id text;
alter table subscriptions
add column if not exists latest_paid_observed_at timestamptz;
alter table subscriptions
add column if not exists provider_synced_at timestamptz not null default now();
alter table subscriptions
add column if not exists reconciliation_closed_at timestamptz;
alter table subscriptions
drop constraint if exists subscriptions_latest_paid_payment_check;
alter table subscriptions
add constraint subscriptions_latest_paid_payment_check check (
  (
    latest_paid_provider_payment_id is null
    and latest_paid_observed_at is null
  )
  or (
    latest_paid_provider_payment_id is not null
    and latest_paid_provider_payment_id =
      btrim(latest_paid_provider_payment_id)
    and latest_paid_provider_payment_id <> ''
    and length(latest_paid_provider_payment_id) <= 255
    and latest_paid_observed_at is not null
  )
);
alter table subscriptions
drop constraint if exists subscriptions_reconciliation_closure_check;
alter table subscriptions
add constraint subscriptions_reconciliation_closure_check check (
  reconciliation_closed_at is null
  or status = 'canceled'
);

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  provider billing_provider not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempted_at timestamptz,
  processing_token uuid,
  processing_started_at timestamptz,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_events_created_at_id_idx
on billing_events (created_at desc, id desc);

create index if not exists billing_events_status_created_at_id_idx
on billing_events (status, created_at desc, id desc);

alter table billing_events
add column if not exists attempt_count integer not null default 0;
alter table billing_events
add column if not exists last_attempted_at timestamptz;
alter table billing_events
add column if not exists processing_token uuid;
alter table billing_events
add column if not exists processing_started_at timestamptz;
alter table billing_events
drop constraint if exists billing_events_attempt_count_nonnegative;
alter table billing_events
add constraint billing_events_attempt_count_nonnegative check (attempt_count >= 0);
alter table billing_events
drop constraint if exists billing_events_status_check;
alter table billing_events
add constraint billing_events_status_check check (
  status in ('received', 'processing', 'processed', 'failed', 'ignored')
);
alter table billing_events
drop constraint if exists billing_events_processing_claim_state_check;
alter table billing_events
add constraint billing_events_processing_claim_state_check check (
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

update billing_events
set
  payload = jsonb_build_object(
    'apiVersion', case
      when jsonb_typeof(payload -> 'api_version') = 'string'
        then payload -> 'api_version'
      else 'null'::jsonb
    end,
    'created', case
      when jsonb_typeof(payload -> 'created') = 'number'
        then payload -> 'created'
      else 'null'::jsonb
    end,
    'id', to_jsonb(provider_event_id),
    'livemode', case
      when jsonb_typeof(payload -> 'livemode') = 'boolean'
        then payload -> 'livemode'
      else 'null'::jsonb
    end,
    'objectId', case
      when jsonb_typeof(payload #> '{data,object,id}') = 'string'
        then payload #> '{data,object,id}'
      else 'null'::jsonb
    end,
    'objectType', case
      when jsonb_typeof(payload #> '{data,object,object}') = 'string'
        then payload #> '{data,object,object}'
      else 'null'::jsonb
    end,
    'type', to_jsonb(event_type)
  ),
  updated_at = clock_timestamp()
where provider = 'stripe'
  and event_type <> 'admin.billing.reconcile'
  and (
    payload ->> 'id' is distinct from provider_event_id
    or payload ->> 'type' is distinct from event_type
    or payload - array[
      'apiVersion',
      'created',
      'id',
      'livemode',
      'objectId',
      'objectType',
      'type'
    ] <> '{}'::jsonb
  );

alter table billing_events
drop constraint if exists billing_events_stripe_payload_minimized;
alter table billing_events
add constraint billing_events_stripe_payload_minimized check (
  provider <> 'stripe'
  or event_type = 'admin.billing.reconcile'
  or (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'id' = provider_event_id
    and payload ->> 'type' = event_type
    and payload - array[
      'apiVersion',
      'created',
      'id',
      'livemode',
      'objectId',
      'objectType',
      'type'
    ] = '{}'::jsonb
  )
);

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
  preview_markdown text not null default '',
  cover_image_url text,
  cover_image_alt text not null default '',
  tags text[] not null default '{}'::text[],
  published_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  constraint content_items_revision_positive check (revision > 0)
);

create table if not exists content_access_rules (
  content_id uuid not null references content_items (id) on delete cascade,
  entitlement_id text not null references entitlements (id) on delete cascade,
  primary key (content_id, entitlement_id)
);

alter table content_items
add column if not exists preview_markdown text not null default '';
alter table content_items
add column if not exists cover_image_alt text not null default '';
alter table content_items
add column if not exists tags text[] not null default '{}'::text[];

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  constraint products_revision_positive check (revision > 0)
);

alter table products add column if not exists price_cents integer not null default 0;
alter table products add column if not exists price_label text not null default 'Set in Stripe';
alter table products add column if not exists bullets text[] not null default '{}'::text[];
alter table products add column if not exists updated_at timestamptz not null default now();
alter table products add column if not exists revision bigint not null default 1;
alter table products alter column is_active set default false;
alter table products drop constraint if exists products_revision_positive;
alter table products add constraint products_revision_positive check (revision > 0);

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
  status_observed_at timestamptz not null default now(),
  dispute_id text,
  dispute_status text,
  dispute_observed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table purchases add column if not exists status_observed_at timestamptz;
update purchases
set status_observed_at = created_at
where status_observed_at is null;
alter table purchases alter column status_observed_at set default now();
alter table purchases alter column status_observed_at set not null;
alter table purchases add column if not exists dispute_id text;
alter table purchases add column if not exists dispute_status text;
alter table purchases add column if not exists dispute_observed_at timestamptz;
alter table purchases drop constraint if exists purchases_dispute_state_check;
alter table purchases add constraint purchases_dispute_state_check check (
  (
    dispute_id is null
    and dispute_status is null
    and dispute_observed_at is null
  )
  or (
    coalesce(dispute_id <> '', false)
    and dispute_status in (
      'warning_needs_response',
      'warning_under_review',
      'warning_closed',
      'needs_response',
      'under_review',
      'won',
      'lost',
      'prevented'
    )
    and dispute_observed_at is not null
  )
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
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  constraint product_assets_revision_positive check (revision > 0)
);

alter table product_assets
add column if not exists revision bigint not null default 1;
alter table product_assets drop constraint if exists product_assets_revision_positive;
alter table product_assets
add constraint product_assets_revision_positive check (revision > 0);

alter table product_assets drop constraint if exists product_assets_product_id_fkey;
alter table product_assets add constraint product_assets_product_id_fkey
foreign key (product_id) references products (id) on delete restrict;

create table if not exists product_asset_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products (id) on delete set null,
  storage_path text not null unique,
  reason text not null check (
    reason in ('abandoned_upload', 'replaced_asset', 'deleted_asset')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'failed', 'processed')
  ),
  not_before timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempted_at timestamptz,
  last_error text,
  processed_at timestamptz,
  claim_token uuid,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_asset_cleanup_jobs_claim_state_check check (
    (status = 'processing' and claim_token is not null and claimed_at is not null)
    or (status <> 'processing' and claim_token is null and claimed_at is null)
  )
);

alter table product_asset_cleanup_jobs
add column if not exists claim_token uuid;
alter table product_asset_cleanup_jobs
add column if not exists claimed_at timestamptz;
alter table product_asset_cleanup_jobs
drop constraint if exists product_asset_cleanup_jobs_status_check;
alter table product_asset_cleanup_jobs
add constraint product_asset_cleanup_jobs_status_check
check (status in ('pending', 'processing', 'failed', 'processed'));
alter table product_asset_cleanup_jobs
drop constraint if exists product_asset_cleanup_jobs_claim_state_check;
alter table product_asset_cleanup_jobs
add constraint product_asset_cleanup_jobs_claim_state_check check (
  (status = 'processing' and claim_token is not null and claimed_at is not null)
  or (status <> 'processing' and claim_token is null and claimed_at is null)
);

create index if not exists product_asset_cleanup_jobs_due_idx
on product_asset_cleanup_jobs (not_before, created_at)
where status in ('pending', 'failed');

create index if not exists product_asset_cleanup_jobs_lease_idx
on product_asset_cleanup_jobs (claimed_at, created_at)
where status = 'processing';

create or replace function public.normalize_product_asset_cleanup_claim()
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

drop trigger if exists product_asset_cleanup_jobs_normalize_claim
on product_asset_cleanup_jobs;
create trigger product_asset_cleanup_jobs_normalize_claim
before insert or update of status, claim_token, claimed_at
on product_asset_cleanup_jobs
for each row execute function public.normalize_product_asset_cleanup_claim();

create table if not exists office_hour_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  signup_url text not null,
  replay_url text,
  required_entitlement_id text references entitlements (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  constraint office_hour_sessions_revision_positive check (revision > 0)
);

alter table office_hour_sessions
add column if not exists updated_at timestamptz not null default now();
alter table office_hour_sessions
add column if not exists revision bigint not null default 1;
alter table office_hour_sessions
drop constraint if exists office_hour_sessions_revision_positive;
alter table office_hour_sessions
add constraint office_hour_sessions_revision_positive check (revision > 0);

create table if not exists checkout_rate_limits (
  user_id uuid not null,
  action text not null check (action in ('product', 'subscription')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, action)
);

create table if not exists subscription_checkout_intents (
  user_id uuid primary key references profiles (id) on delete cascade,
  request_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_checkout_intents_expiry_check check (expires_at > created_at)
);

create table if not exists product_checkout_intents (
  user_id uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  request_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id),
  constraint product_checkout_intents_expiry_check check (expires_at > created_at)
);

create table if not exists role_change_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid not null,
  previous_role user_role not null,
  assigned_role user_role not null,
  change_source text not null default 'admin_rpc',
  created_at timestamptz not null default now()
);

alter table role_change_events
alter column actor_user_id drop not null;
alter table role_change_events
add column if not exists change_source text not null default 'admin_rpc';
alter table role_change_events
drop constraint if exists role_change_events_actor_source_check;
alter table role_change_events
add constraint role_change_events_actor_source_check check (
  (
    change_source = 'admin_rpc'
    and actor_user_id is not null
  )
  or (
    change_source = 'first_admin_bootstrap'
    and actor_user_id is null
  )
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

drop trigger if exists products_track_revision on products;
create trigger products_track_revision
before update on products
for each row execute function public.track_product_revision();

create or replace function public.track_office_hour_revision()
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

drop trigger if exists office_hours_track_revision on office_hour_sessions;
create trigger office_hours_track_revision
before update on office_hour_sessions
for each row execute function public.track_office_hour_revision();

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

drop trigger if exists product_assets_track_revision on product_assets;
create trigger product_assets_track_revision
before update on product_assets
for each row execute function public.track_product_asset_revision();

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

create or replace function public.claim_subscription_checkout(p_request_id uuid)
returns table (
  outcome text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_time timestamptz := clock_timestamp();
  claim_duration constant interval := interval '35 minutes';
  claim_expires_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.subscription-checkout:' || current_user_id::text, 0)
  );

  if exists (
    select 1
    from public.subscriptions s
    where s.user_id = current_user_id
      and s.provider = 'stripe'::billing_provider
      and s.status in (
        'active',
        'trialing',
        'incomplete',
        'past_due',
        'unpaid',
        'paused'
      )
  ) then
    return query select 'existing_subscription'::text, null::timestamptz;
    return;
  end if;

  insert into public.subscription_checkout_intents (
    user_id,
    request_id,
    expires_at,
    created_at,
    updated_at
  )
  values (
    current_user_id,
    p_request_id,
    request_time + claim_duration,
    request_time,
    request_time
  )
  on conflict (user_id) do update
  set
    request_id = excluded.request_id,
    expires_at = case
      when subscription_checkout_intents.request_id = excluded.request_id
        then subscription_checkout_intents.expires_at
      else excluded.expires_at
    end,
    created_at = case
      when subscription_checkout_intents.request_id = excluded.request_id
        then subscription_checkout_intents.created_at
      else excluded.created_at
    end,
    updated_at = excluded.updated_at
  where subscription_checkout_intents.expires_at <= request_time
    or subscription_checkout_intents.request_id = excluded.request_id
  returning subscription_checkout_intents.expires_at into claim_expires_at;

  if not found then
    select intent.expires_at
    into claim_expires_at
    from public.subscription_checkout_intents intent
    where intent.user_id = current_user_id;

    return query select 'checkout_in_progress'::text, claim_expires_at;
    return;
  end if;

  return query select 'claimed'::text, claim_expires_at;
end;
$$;

create or replace function public.claim_product_checkout(
  p_product_id uuid,
  p_request_id uuid
)
returns table (
  outcome text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_time timestamptz := clock_timestamp();
  claim_duration constant interval := interval '35 minutes';
  claim_expires_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_product_id is null then
    raise exception 'product_id_required' using errcode = '22023';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.product-checkout:' || current_user_id::text || ':' || p_product_id::text,
      0
    )
  );

  if exists (
    select 1
    from public.purchases p
    where p.user_id = current_user_id
      and p.product_id = p_product_id
      and p.status in ('paid', 'no_payment_required', 'partially_refunded')
  ) then
    return query select 'already_purchased'::text, null::timestamptz;
    return;
  end if;

  insert into public.product_checkout_intents (
    user_id,
    product_id,
    request_id,
    expires_at,
    created_at,
    updated_at
  )
  values (
    current_user_id,
    p_product_id,
    p_request_id,
    request_time + claim_duration,
    request_time,
    request_time
  )
  on conflict (user_id, product_id) do update
  set
    request_id = excluded.request_id,
    expires_at = case
      when product_checkout_intents.request_id = excluded.request_id
        then product_checkout_intents.expires_at
      else excluded.expires_at
    end,
    created_at = case
      when product_checkout_intents.request_id = excluded.request_id
        then product_checkout_intents.created_at
      else excluded.created_at
    end,
    updated_at = excluded.updated_at
  where product_checkout_intents.expires_at <= request_time
    or product_checkout_intents.request_id = excluded.request_id
  returning product_checkout_intents.expires_at into claim_expires_at;

  if not found then
    select intent.expires_at
    into claim_expires_at
    from public.product_checkout_intents intent
    where intent.user_id = current_user_id
      and intent.product_id = p_product_id;

    return query select 'checkout_in_progress'::text, claim_expires_at;
    return;
  end if;

  return query select 'claimed'::text, claim_expires_at;
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

create or replace function public.bootstrap_first_admin(p_target_email text)
returns table (
  target_user_id uuid,
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
  normalized_email text := lower(btrim(coalesce(p_target_email, '')));
  selected_user_id uuid;
  previous_access_role user_role;
  event_created_at timestamptz := clock_timestamp();
begin
  if normalized_email = ''
    or normalized_email = 'your-main-email@example.com'
    or length(normalized_email) > 320
  then
    raise exception 'invalid_target_email' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('soji.admin-role-change', 0));

  if exists (
    select 1 from public.user_roles where role = 'admin'::user_role
  ) then
    raise exception 'first_admin_already_exists' using errcode = '23514';
  end if;

  select id
  into selected_user_id
  from public.profiles
  where email = normalized_email;

  if selected_user_id is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  previous_access_role := case
    when exists (
      select 1 from public.user_roles
      where user_id = selected_user_id and role = 'editor'::user_role
    ) then 'editor'::user_role
    else 'member'::user_role
  end;

  insert into public.user_roles (user_id, role)
  values (selected_user_id, 'member'::user_role)
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_id = selected_user_id
    and role in ('editor'::user_role, 'admin'::user_role);

  insert into public.user_roles (user_id, role)
  values (selected_user_id, 'admin'::user_role);

  insert into public.role_change_events (
    actor_user_id,
    target_user_id,
    previous_role,
    assigned_role,
    change_source,
    created_at
  ) values (
    null,
    selected_user_id,
    previous_access_role,
    'admin'::user_role,
    'first_admin_bootstrap',
    event_created_at
  );

  return query select
    selected_user_id,
    previous_access_role,
    'admin'::user_role,
    event_created_at;
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

drop function if exists public.upsert_content_item(
  uuid, text, text, text, content_type, visibility, text, text, boolean, text[]
);
drop function if exists public.upsert_content_item(
  uuid, text, text, text, content_type, visibility,
  text, text, boolean, text[], bigint
);
drop function if exists public.upsert_content_item(
  uuid, text, text, text, content_type, visibility,
  text, text, text, text, text[], boolean, text[], bigint
);
create or replace function public.upsert_content_item(
  p_content_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_type content_type,
  p_visibility visibility,
  p_body_markdown text,
  p_preview_markdown text,
  p_cover_image_url text,
  p_cover_image_alt text,
  p_tags text[],
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
      preview_markdown,
      cover_image_url,
      cover_image_alt,
      tags,
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
      p_preview_markdown,
      nullif(p_cover_image_url, ''),
      p_cover_image_alt,
      coalesce(p_tags, '{}'::text[]),
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
      preview_markdown = p_preview_markdown,
      cover_image_url = nullif(p_cover_image_url, ''),
      cover_image_alt = p_cover_image_alt,
      tags = coalesce(p_tags, '{}'::text[]),
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

drop function if exists public.delete_content_item(uuid);

create or replace function public.delete_content_item(
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

drop function if exists public.delete_product_asset(uuid, bigint);

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

create or replace function public.upsert_office_hour(
  p_office_hour_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_signup_url text,
  p_replay_url text,
  p_required_entitlement_id text,
  p_expected_revision bigint default null
)
returns table (id uuid, revision bigint)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_user_id uuid := auth.uid();
  saved_id uuid;
  saved_revision bigint;
begin
  if caller_user_id is null or not public.is_editor_or_admin() then
    raise exception 'publisher_role_required' using errcode = '42501';
  end if;

  if p_office_hour_id is null then
    insert into public.office_hour_sessions (
      title,
      starts_at,
      signup_url,
      replay_url,
      required_entitlement_id
    ) values (
      p_title,
      p_starts_at,
      p_signup_url,
      nullif(p_replay_url, ''),
      p_required_entitlement_id
    )
    returning office_hour_sessions.id, office_hour_sessions.revision
    into saved_id, saved_revision;
  else
    if p_expected_revision is null or p_expected_revision < 1 then
      raise exception 'expected_office_hour_revision_required' using errcode = '22023';
    end if;

    update public.office_hour_sessions
    set
      title = p_title,
      starts_at = p_starts_at,
      signup_url = p_signup_url,
      replay_url = nullif(p_replay_url, ''),
      required_entitlement_id = p_required_entitlement_id
    where office_hour_sessions.id = p_office_hour_id
      and office_hour_sessions.revision = p_expected_revision
    returning office_hour_sessions.id, office_hour_sessions.revision
    into saved_id, saved_revision;

    if saved_id is null then
      if exists (
        select 1
        from public.office_hour_sessions as existing_session
        where existing_session.id = p_office_hour_id
      ) then
        raise exception 'office_hour_write_conflict' using errcode = '40001';
      end if;
      raise exception 'office_hour_not_found' using errcode = 'P0002';
    end if;
  end if;

  return query select saved_id, saved_revision;
end;
$$;

create or replace function public.delete_office_hour(
  p_office_hour_id uuid,
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
    raise exception 'expected_office_hour_revision_required' using errcode = '22023';
  end if;

  delete from public.office_hour_sessions as deleted_session
  where deleted_session.id = p_office_hour_id
    and deleted_session.revision = p_expected_revision;
  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    if exists (
      select 1
      from public.office_hour_sessions as existing_session
      where existing_session.id = p_office_hour_id
    ) then
      raise exception 'office_hour_delete_conflict' using errcode = '40001';
    end if;
    raise exception 'office_hour_not_found' using errcode = 'P0002';
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
  effective_plan_id membership_tier;
  effective_status text;
  effective_period_ends_at timestamptz;
  effective_observed_at timestamptz;
  existing_user_id uuid;
begin
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select subscription.user_id
  into existing_user_id
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

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
    cancel_at_period_end,
    provider_synced_at,
    reconciliation_closed_at,
    status_observed_at
  ) values (
    p_user_id,
    'stripe'::billing_provider,
    p_provider_customer_id,
    p_provider_subscription_id,
    p_plan_id,
    p_status,
    p_current_period_ends_at,
    p_cancelled_at,
    p_cancel_at_period_end,
    clock_timestamp(),
    null,
    p_observed_at
  )
  on conflict (provider_subscription_id) do update
  set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_ends_at = excluded.current_period_ends_at,
    cancelled_at = excluded.cancelled_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider_synced_at = clock_timestamp(),
    reconciliation_closed_at = null,
    status_observed_at = excluded.status_observed_at
  where (
      excluded.status_observed_at >= subscriptions.status_observed_at
      or subscriptions.reconciliation_closed_at is not null
    )
    and not (
      subscriptions.status in ('canceled', 'incomplete_expired')
      and excluded.status not in ('canceled', 'incomplete_expired')
      and subscriptions.reconciliation_closed_at is null
    );

  select subscription.plan_id, subscription.status,
    subscription.current_period_ends_at, subscription.status_observed_at
  into effective_plan_id, effective_status, effective_period_ends_at,
    effective_observed_at
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

  update public.user_entitlements
  set ends_at = effective_observed_at
  where user_id = p_user_id
    and source_type = 'subscription'
    and source_id = p_provider_subscription_id;

  if effective_status in ('active', 'trialing') then
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
      'subscription',
      p_provider_subscription_id,
      effective_observed_at,
      effective_period_ends_at
    from public.plan_entitlements as plan_entitlement
    where plan_entitlement.plan_id = effective_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = excluded.ends_at;
  end if;

  select case coalesce(max(
    case subscription.plan_id
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
  from public.subscriptions as subscription
  where subscription.user_id = p_user_id
    and subscription.status in ('active', 'trialing');

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
  effective_status text;
  effective_dispute_status text;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('paid', 'no_payment_required') then
    raise exception 'purchase_payment_not_complete' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select product.entitlement_id
  into product_entitlement_id
  from public.products as product
  where product.id = p_product_id;

  if product_entitlement_id is null then
    raise exception 'product_entitlement_not_configured' using errcode = '23514';
  end if;

  select purchase.user_id, purchase.product_id
  into existing_user_id, existing_product_id
  from public.purchases as purchase
  where purchase.provider_payment_id = p_provider_payment_id
  for update;

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
    status,
    status_observed_at
  ) values (
    p_user_id,
    p_product_id,
    'stripe'::billing_provider,
    p_provider_payment_id,
    p_status,
    p_observed_at
  )
  on conflict (provider_payment_id) do update
  set
    status = excluded.status,
    status_observed_at = excluded.status_observed_at
  where purchases.status <> 'refunded'
    and excluded.status_observed_at >= purchases.status_observed_at;

  select purchase.status, purchase.dispute_status
  into effective_status, effective_dispute_status
  from public.purchases as purchase
  where purchase.provider_payment_id = p_provider_payment_id;

  if effective_status in ('paid', 'no_payment_required', 'partially_refunded')
    and coalesce(
      effective_dispute_status not in (
        'warning_needs_response',
        'warning_under_review',
        'needs_response',
        'under_review',
        'lost'
      ),
      true
    )
  then
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
  else
    delete from public.user_entitlements
    where user_id = p_user_id
      and entitlement_id = product_entitlement_id
      and source_type = 'purchase'
      and source_id = p_provider_payment_id;
  end if;

  return product_entitlement_id;
end;
$$;

create or replace function public.sync_stripe_product_dispute(
  p_provider_payment_id text,
  p_provider_dispute_id text,
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
  purchase_user_id uuid;
  purchase_entitlement_id text;
  purchase_status text;
  current_dispute_id text;
  current_dispute_status text;
  current_observed_at timestamptz;
  current_rank integer;
  incoming_rank integer;
  blocks_access boolean;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_provider_dispute_id is null or btrim(p_provider_dispute_id) = '' then
    raise exception 'provider_dispute_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in (
    'warning_needs_response',
    'warning_under_review',
    'warning_closed',
    'needs_response',
    'under_review',
    'won',
    'lost',
    'prevented'
  ) then
    raise exception 'invalid_purchase_dispute_status' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'dispute_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select purchase.user_id, product.entitlement_id, purchase.status,
    purchase.dispute_id, purchase.dispute_status, purchase.dispute_observed_at
  into purchase_user_id, purchase_entitlement_id, purchase_status,
    current_dispute_id, current_dispute_status, current_observed_at
  from public.purchases as purchase
  join public.products as product on product.id = purchase.product_id
  where purchase.provider = 'stripe'::billing_provider
    and purchase.provider_payment_id = p_provider_payment_id
  for update of purchase;

  if purchase_user_id is null then
    raise exception 'purchase_not_found' using errcode = 'P0002';
  end if;

  current_rank := case current_dispute_status
    when 'won' then 4
    when 'warning_closed' then 3
    when 'prevented' then 3
    when 'lost' then 2
    when 'warning_needs_response' then 1
    when 'warning_under_review' then 1
    when 'needs_response' then 1
    when 'under_review' then 1
    else 0
  end;
  incoming_rank := case p_status
    when 'won' then 4
    when 'warning_closed' then 3
    when 'prevented' then 3
    when 'lost' then 2
    else 1
  end;

  if current_observed_at is not null and (
    p_observed_at < current_observed_at
    or (
      p_observed_at = current_observed_at
      and (
        (
          p_provider_dispute_id = current_dispute_id
          and incoming_rank <= current_rank
        )
        or (
          p_provider_dispute_id <> current_dispute_id
          and p_provider_dispute_id <= current_dispute_id
        )
      )
    )
  ) then
    return current_dispute_status;
  end if;

  update public.purchases as purchase
  set
    dispute_id = p_provider_dispute_id,
    dispute_status = p_status,
    dispute_observed_at = p_observed_at
  where purchase.provider_payment_id = p_provider_payment_id;

  blocks_access := p_status in (
    'warning_needs_response',
    'warning_under_review',
    'needs_response',
    'under_review',
    'lost'
  );

  if blocks_access or purchase_status = 'refunded' then
    delete from public.user_entitlements
    where user_id = purchase_user_id
      and entitlement_id = purchase_entitlement_id
      and source_type = 'purchase'
      and source_id = p_provider_payment_id;
  elsif purchase_status in ('paid', 'no_payment_required', 'partially_refunded') then
    insert into public.user_entitlements (
      user_id,
      entitlement_id,
      source_type,
      source_id,
      starts_at,
      ends_at
    ) values (
      purchase_user_id,
      purchase_entitlement_id,
      'purchase',
      p_provider_payment_id,
      p_observed_at,
      null
    )
    on conflict (user_id, entitlement_id, source_type, source_id) do nothing;
  end if;

  return p_status;
end;
$$;

create or replace function public.sync_stripe_product_refund(
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
  purchase_user_id uuid;
  purchase_product_id uuid;
  purchase_entitlement_id text;
  current_status text;
  current_observed_at timestamptz;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('partially_refunded', 'refunded') then
    raise exception 'invalid_purchase_refund_status' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
  );

  select purchase.user_id, purchase.product_id, product.entitlement_id,
    purchase.status, purchase.status_observed_at
  into purchase_user_id, purchase_product_id, purchase_entitlement_id,
    current_status, current_observed_at
  from public.purchases as purchase
  join public.products as product on product.id = purchase.product_id
  where purchase.provider = 'stripe'::billing_provider
    and purchase.provider_payment_id = p_provider_payment_id
  for update of purchase;

  if purchase_user_id is null then
    raise exception 'purchase_not_found' using errcode = 'P0002';
  end if;

  if current_status = 'refunded'
    or p_observed_at < current_observed_at
    or (p_observed_at = current_observed_at and p_status = 'partially_refunded')
  then
    return current_status;
  end if;

  update public.purchases as purchase
  set
    status = p_status,
    status_observed_at = p_observed_at
  where purchase.provider_payment_id = p_provider_payment_id;

  if p_status = 'refunded' then
    delete from public.user_entitlements
    where user_id = purchase_user_id
      and entitlement_id = purchase_entitlement_id
      and source_type = 'purchase'
      and source_id = p_provider_payment_id;

    delete from public.product_checkout_intents
    where user_id = purchase_user_id
      and product_id = purchase_product_id;
  end if;

  return p_status;
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
      'public.finish_billing_event_attempt(uuid,uuid,boolean,text,text)',
      'execute'
    )
    and pg_catalog.has_function_privilege(
      'service_role',
      'public.sync_stripe_product_dispute(text,text,text,timestamptz)',
      'execute'
    )
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
    and event.status not in ('processed', 'ignored')
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

drop function if exists public.finish_billing_event_attempt(
  uuid, uuid, boolean, text
);
drop function if exists public.finish_billing_event_attempt(
  uuid, uuid, boolean, text, text
);
create function public.finish_billing_event_attempt(
  p_billing_event_id uuid,
  p_claim_token uuid,
  p_succeeded boolean,
  p_error text default null,
  p_result_status text default null
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

  if p_succeeded and coalesce(p_result_status, 'processed') not in ('processed', 'ignored') then
    raise exception 'billing_event_result_status_invalid' using errcode = '22023';
  end if;

  update public.billing_events as event
  set
    status = case
      when p_succeeded then coalesce(p_result_status, 'processed')
      else 'failed'
    end,
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

  v_email := lower(left(coalesce(nullif(btrim(v_claims ->> 'email'), ''), ''), 320));
  if v_email = '' then
    raise exception 'profile_email_required' using errcode = '22023';
  end if;
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
    email = excluded.email,
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

revoke insert, update, delete on table profiles from authenticated;
revoke insert, update, delete on table user_roles from authenticated;
revoke insert, update, delete on table
  content_items,
  content_access_rules,
  products,
  product_assets,
  office_hour_sessions
from authenticated;

revoke all on table public.checkout_rate_limits from anon, authenticated;
revoke all on table public.subscription_checkout_intents from anon, authenticated;
revoke all on table public.product_checkout_intents from anon, authenticated;

revoke all on function public.has_role(user_role) from public;
grant execute on function public.has_role(user_role) to anon, authenticated;
revoke all on function public.is_editor_or_admin() from public;
grant execute on function public.is_editor_or_admin() to anon, authenticated;
revoke all on function public.consume_checkout_rate_limit(text) from public;
grant execute on function public.consume_checkout_rate_limit(text) to authenticated;
revoke all on function public.claim_subscription_checkout(uuid) from public;
grant execute on function public.claim_subscription_checkout(uuid) to authenticated;
revoke all on function public.claim_product_checkout(uuid, uuid) from public;
grant execute on function public.claim_product_checkout(uuid, uuid) to authenticated;
revoke all on function public.set_user_access_role(uuid, user_role) from public;
grant execute on function public.set_user_access_role(uuid, user_role) to authenticated;
revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;
revoke all on function public.list_managed_users(text, integer, integer) from public;
grant execute on function public.list_managed_users(text, integer, integer) to authenticated;
revoke all on function public.upsert_content_item(
  uuid, text, text, text, content_type, visibility,
  text, text, text, text, text[], boolean, text[], bigint
) from public;
grant execute on function public.upsert_content_item(
  uuid, text, text, text, content_type, visibility,
  text, text, text, text, text[], boolean, text[], bigint
) to authenticated;
revoke all on function public.delete_content_item(uuid, bigint) from public;
grant execute on function public.delete_content_item(uuid, bigint) to authenticated;
revoke all on function public.upsert_product(
  uuid, text, text, text, integer, text, text[], text, text, boolean, bigint
) from public;
grant execute on function public.upsert_product(
  uuid, text, text, text, integer, text, text[], text, text, boolean, bigint
) to authenticated;
revoke all on function public.archive_product(uuid, bigint) from public;
grant execute on function public.archive_product(uuid, bigint) to authenticated;
revoke all on function public.replace_product_asset(
  uuid, text, text, text, bigint, bigint
) from public;
grant execute on function public.replace_product_asset(
  uuid, text, text, text, bigint, bigint
) to authenticated;
revoke all on function public.delete_product_asset(uuid, bigint) from public;
grant execute on function public.delete_product_asset(uuid, bigint) to authenticated;
revoke all on function public.upsert_office_hour(
  uuid, text, timestamptz, text, text, text, bigint
) from public;
grant execute on function public.upsert_office_hour(
  uuid, text, timestamptz, text, text, text, bigint
) to authenticated;
revoke all on function public.delete_office_hour(uuid, bigint) from public;
grant execute on function public.delete_office_hour(uuid, bigint) to authenticated;
revoke all on function public.service_role_readiness() from public, anon, authenticated;
grant execute on function public.service_role_readiness() to service_role;
revoke all on function public.begin_billing_event_attempt(uuid) from public, anon, authenticated;
grant execute on function public.begin_billing_event_attempt(uuid) to service_role;
revoke all on function public.finish_billing_event_attempt(
  uuid, uuid, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.finish_billing_event_attempt(
  uuid, uuid, boolean, text, text
) to service_role;
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
revoke all on function public.sync_stripe_product_refund(
  text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_refund(
  text, text, timestamptz
) to service_role;
revoke all on function public.sync_stripe_product_dispute(
  text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_dispute(
  text, text, text, timestamptz
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
alter table subscription_checkout_intents enable row level security;
alter table product_checkout_intents enable row level security;
alter table role_change_events enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
using (id = auth.uid() or public.has_role('admin'::user_role));

drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;

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
      and purchases.status in ('paid', 'no_payment_required', 'partially_refunded')
      and coalesce(
        purchases.dispute_status not in (
          'warning_needs_response',
          'warning_under_review',
          'needs_response',
          'under_review',
          'lost'
        ),
        true
      )
  )
);

drop policy if exists "product_assets_editor_insert" on product_assets;
drop policy if exists "product_assets_editor_update" on product_assets;
drop policy if exists "product_assets_editor_delete" on product_assets;

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

-- Durable compensation for Storage operations that cannot share a SQL transaction.
alter table product_asset_cleanup_jobs enable row level security;

drop policy if exists "product_asset_cleanup_jobs_select_admin"
on product_asset_cleanup_jobs;
create policy "product_asset_cleanup_jobs_select_admin"
on product_asset_cleanup_jobs for select
using (public.has_role('admin'::user_role));

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

create or replace function public.replace_product_asset(
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

create or replace function public.delete_product_asset(
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

create or replace function public.claim_product_asset_cleanup_jobs(
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

drop function if exists public.record_product_asset_cleanup_attempt(uuid, boolean, text);

create or replace function public.record_product_asset_cleanup_attempt(
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

grant all privileges on table product_asset_cleanup_jobs to service_role;
grant select on table product_asset_cleanup_jobs to authenticated;
revoke insert, update, delete on table product_asset_cleanup_jobs from authenticated;

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

create table if not exists public.subscription_billing_adjustments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.subscriptions (id) on delete cascade,
  provider billing_provider not null default 'stripe',
  provider_payment_id text not null,
  provider_adjustment_id text not null,
  kind text not null,
  status text not null,
  amount integer not null,
  currency text not null,
  blocks_access boolean not null,
  observed_at timestamptz not null,
  superseded_by_provider_payment_id text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_billing_adjustments_provider_identity_key
    unique (provider, kind, provider_adjustment_id),
  constraint subscription_billing_adjustments_provider_ids_check check (
    provider_payment_id = btrim(provider_payment_id)
    and provider_payment_id <> ''
    and length(provider_payment_id) <= 255
    and provider_adjustment_id = btrim(provider_adjustment_id)
    and provider_adjustment_id <> ''
    and length(provider_adjustment_id) <= 255
  ),
  constraint subscription_billing_adjustments_kind_status_check check (
    (
      kind = 'refund'
      and status in ('partially_refunded', 'refunded')
      and blocks_access = (status = 'refunded')
    )
    or (
      kind = 'dispute'
      and status in (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'won',
        'lost',
        'prevented'
      )
      and blocks_access = (
        status in (
          'warning_needs_response',
          'warning_under_review',
          'needs_response',
          'under_review',
          'lost'
        )
      )
    )
  ),
  constraint subscription_billing_adjustments_amount_currency_check check (
    amount >= 0
    and currency = lower(btrim(currency))
    and currency ~ '^[a-z]{3}$'
  ),
  constraint subscription_billing_adjustments_supersession_check check (
    (
      superseded_by_provider_payment_id is null
      and superseded_at is null
    )
    or (
      kind = 'refund'
      and status = 'refunded'
      and blocks_access
      and superseded_by_provider_payment_id is not null
      and superseded_by_provider_payment_id =
        btrim(superseded_by_provider_payment_id)
      and superseded_by_provider_payment_id <> ''
      and length(superseded_by_provider_payment_id) <= 255
      and superseded_by_provider_payment_id <> provider_payment_id
      and superseded_at > observed_at
    )
  )
);

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

create index if not exists
subscription_billing_adjustments_subscription_observed_idx
on public.subscription_billing_adjustments (
  subscription_id,
  observed_at desc,
  provider_adjustment_id desc
);

create index if not exists
subscription_billing_adjustments_active_blocks_idx
on public.subscription_billing_adjustments (subscription_id)
where blocks_access and superseded_at is null;

alter table public.billing_events
drop constraint if exists billing_events_stripe_payload_minimized;
alter table public.billing_events
add constraint billing_events_stripe_payload_minimized check (
  provider <> 'stripe'
  or event_type = 'admin.billing.reconcile'
  or (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'id' = provider_event_id
    and payload ->> 'type' = event_type
    and payload - array[
      'apiVersion',
      'chargeId',
      'created',
      'customerId',
      'disputeId',
      'id',
      'livemode',
      'objectId',
      'objectType',
      'paymentId',
      'subscriptionId',
      'type'
    ] = '{}'::jsonb
    and (
      not payload ? 'chargeId'
      or (
        jsonb_typeof(payload -> 'chargeId') = 'string'
        and length(payload ->> 'chargeId') between 1 and 255
      )
    )
    and (
      not payload ? 'customerId'
      or (
        jsonb_typeof(payload -> 'customerId') = 'string'
        and length(payload ->> 'customerId') between 1 and 255
      )
    )
    and (
      not payload ? 'disputeId'
      or (
        jsonb_typeof(payload -> 'disputeId') = 'string'
        and length(payload ->> 'disputeId') between 1 and 255
      )
    )
    and (
      not payload ? 'paymentId'
      or (
        jsonb_typeof(payload -> 'paymentId') = 'string'
        and length(payload ->> 'paymentId') between 1 and 255
      )
    )
    and (
      not payload ? 'subscriptionId'
      or (
        jsonb_typeof(payload -> 'subscriptionId') = 'string'
        and length(payload ->> 'subscriptionId') between 1 and 255
      )
    )
  )
);

create or replace function public.recompute_stripe_subscription_access(
  p_subscription_id uuid,
  p_effective_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
  subscription_period_ends_at timestamptz;
  subscription_plan_id membership_tier;
  subscription_provider_id text;
  subscription_status text;
  subscription_user_id uuid;
begin
  if p_subscription_id is null then
    raise exception 'subscription_id_required' using errcode = '22023';
  end if;
  if p_effective_observed_at is null then
    raise exception 'effective_observed_at_required' using errcode = '22023';
  end if;

  select
    subscription.user_id,
    subscription.provider_subscription_id,
    subscription.plan_id,
    subscription.status,
    subscription.current_period_ends_at
  into
    subscription_user_id,
    subscription_provider_id,
    subscription_plan_id,
    subscription_status,
    subscription_period_ends_at
  from public.subscriptions as subscription
  where subscription.id = p_subscription_id
  for update;

  if subscription_user_id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  update public.user_entitlements
  set ends_at = p_effective_observed_at
  where user_id = subscription_user_id
    and source_type = 'subscription'
    and source_id = subscription_provider_id;

  if subscription_status in ('active', 'trialing')
    and not exists (
      select 1
      from public.subscription_billing_adjustments as adjustment
      where adjustment.subscription_id = p_subscription_id
        and adjustment.blocks_access
        and adjustment.superseded_at is null
    )
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
      subscription_user_id,
      plan_entitlement.entitlement_id,
      'subscription',
      subscription_provider_id,
      p_effective_observed_at,
      subscription_period_ends_at
    from public.plan_entitlements as plan_entitlement
    where plan_entitlement.plan_id = subscription_plan_id
    on conflict (user_id, entitlement_id, source_type, source_id) do update
    set ends_at = excluded.ends_at;
  end if;

  select case coalesce(max(
    case subscription.plan_id
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
  from public.subscriptions as subscription
  where subscription.user_id = subscription_user_id
    and subscription.status in ('active', 'trialing')
    and not exists (
      select 1
      from public.subscription_billing_adjustments as adjustment
      where adjustment.subscription_id = subscription.id
        and adjustment.blocks_access
        and adjustment.superseded_at is null
    );

  update public.profiles
  set tier = effective_tier
  where id = subscription_user_id;

  return effective_tier;
end;
$$;

-- This post-helper definition is authoritative and must preserve synthetic
-- reconciliation repair semantics when the declarative schema is reapplied.
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
  effective_observed_at timestamptz;
  existing_user_id uuid;
  saved_subscription_id uuid;
begin
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select subscription.user_id
  into existing_user_id
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

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
    cancel_at_period_end,
    provider_synced_at,
    reconciliation_closed_at,
    status_observed_at
  ) values (
    p_user_id,
    'stripe'::billing_provider,
    p_provider_customer_id,
    p_provider_subscription_id,
    p_plan_id,
    p_status,
    p_current_period_ends_at,
    p_cancelled_at,
    p_cancel_at_period_end,
    clock_timestamp(),
    null,
    p_observed_at
  )
  on conflict (provider_subscription_id) do update
  set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_ends_at = excluded.current_period_ends_at,
    cancelled_at = excluded.cancelled_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider_synced_at = clock_timestamp(),
    reconciliation_closed_at = null,
    status_observed_at = excluded.status_observed_at
  where (
      excluded.status_observed_at >= subscriptions.status_observed_at
      or subscriptions.reconciliation_closed_at is not null
    )
    and not (
      subscriptions.status in ('canceled', 'incomplete_expired')
      and excluded.status not in ('canceled', 'incomplete_expired')
      and subscriptions.reconciliation_closed_at is null
    );

  select subscription.id, subscription.status_observed_at
  into saved_subscription_id, effective_observed_at
  from public.subscriptions as subscription
  where subscription.provider_subscription_id = p_provider_subscription_id;

  return public.recompute_stripe_subscription_access(
    saved_subscription_id,
    effective_observed_at
  );
end;
$$;

drop function if exists
public.close_missing_stripe_customer_subscriptions(
  text,
  text[],
  timestamptz
);

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

create or replace function public.sync_stripe_subscription_adjustment(
  p_provider_subscription_id text,
  p_provider_payment_id text,
  p_provider_adjustment_id text,
  p_kind text,
  p_status text,
  p_amount integer,
  p_currency text,
  p_observed_at timestamptz default clock_timestamp()
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  adjustment_blocks_access boolean;
  current_observed_at timestamptz;
  current_rank integer;
  current_status text;
  existing_payment_id text;
  existing_subscription_id uuid;
  incoming_rank integer;
  latest_paid_observed_at timestamptz;
  latest_paid_provider_payment_id text;
  subscription_user_id uuid;
  target_subscription_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
    or length(btrim(p_provider_subscription_id)) > 255
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;
  if p_provider_payment_id is null
    or btrim(p_provider_payment_id) = ''
    or length(btrim(p_provider_payment_id)) > 255
  then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_provider_adjustment_id is null
    or btrim(p_provider_adjustment_id) = ''
    or length(btrim(p_provider_adjustment_id)) > 255
  then
    raise exception 'provider_adjustment_id_required' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'invalid_adjustment_amount' using errcode = '22023';
  end if;
  if p_currency is null or p_currency !~ '^[a-z]{3}$' then
    raise exception 'invalid_adjustment_currency' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'adjustment_observed_at_required' using errcode = '22023';
  end if;
  if not (
    (p_kind = 'refund' and p_status in ('partially_refunded', 'refunded'))
    or (
      p_kind = 'dispute'
      and p_status in (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'won',
        'lost',
        'prevented'
      )
    )
  ) then
    raise exception 'invalid_subscription_adjustment_state'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );
  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-adjustment:' || p_kind || ':' || p_provider_adjustment_id,
      0
    )
  );

  select
    subscription.id,
    subscription.user_id,
    subscription.latest_paid_provider_payment_id,
    subscription.latest_paid_observed_at
  into
    target_subscription_id,
    subscription_user_id,
    latest_paid_provider_payment_id,
    latest_paid_observed_at
  from public.subscriptions as subscription
  where subscription.provider = 'stripe'::billing_provider
    and subscription.provider_subscription_id = p_provider_subscription_id;

  if target_subscription_id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(subscription_user_id::text, 0));

  select
    adjustment.subscription_id,
    adjustment.provider_payment_id,
    adjustment.status,
    adjustment.observed_at
  into
    existing_subscription_id,
    existing_payment_id,
    current_status,
    current_observed_at
  from public.subscription_billing_adjustments as adjustment
  where adjustment.provider = 'stripe'::billing_provider
    and adjustment.kind = p_kind
    and adjustment.provider_adjustment_id = p_provider_adjustment_id
  for update;

  if existing_subscription_id is not null
    and (
      existing_subscription_id <> target_subscription_id
      or existing_payment_id <> p_provider_payment_id
    )
  then
    raise exception 'adjustment_ownership_conflict' using errcode = '23505';
  end if;

  current_rank := case current_status
    when 'partially_refunded' then 1
    when 'refunded' then 2
    when 'warning_needs_response' then 1
    when 'warning_under_review' then 1
    when 'needs_response' then 1
    when 'under_review' then 1
    when 'warning_closed' then 2
    when 'won' then 2
    when 'prevented' then 2
    when 'lost' then 3
    else 0
  end;
  incoming_rank := case p_status
    when 'partially_refunded' then 1
    when 'refunded' then 2
    when 'warning_needs_response' then 1
    when 'warning_under_review' then 1
    when 'needs_response' then 1
    when 'under_review' then 1
    when 'warning_closed' then 2
    when 'won' then 2
    when 'prevented' then 2
    when 'lost' then 3
  end;

  if current_observed_at is not null
    and (
      current_status in ('refunded', 'lost')
      or p_observed_at < current_observed_at
      or (
        p_observed_at = current_observed_at
        and incoming_rank <= current_rank
      )
    )
  then
    return current_status;
  end if;

  adjustment_blocks_access := (
    p_status = 'refunded'
    or p_status in (
      'warning_needs_response',
      'warning_under_review',
      'needs_response',
      'under_review',
      'lost'
    )
  );

  if existing_subscription_id is null then
    insert into public.subscription_billing_adjustments (
      subscription_id,
      provider,
      provider_payment_id,
      provider_adjustment_id,
      kind,
      status,
      amount,
      currency,
      blocks_access,
      observed_at
    ) values (
      target_subscription_id,
      'stripe'::billing_provider,
      p_provider_payment_id,
      p_provider_adjustment_id,
      p_kind,
      p_status,
      p_amount,
      p_currency,
      adjustment_blocks_access,
      p_observed_at
    );
  else
    update public.subscription_billing_adjustments as adjustment
    set
      status = p_status,
      amount = p_amount,
      currency = p_currency,
      blocks_access = adjustment_blocks_access,
      observed_at = p_observed_at,
      updated_at = clock_timestamp()
    where adjustment.provider = 'stripe'::billing_provider
      and adjustment.kind = p_kind
      and adjustment.provider_adjustment_id = p_provider_adjustment_id;
  end if;

  if p_kind = 'refund'
    and p_status = 'refunded'
    and latest_paid_observed_at > p_observed_at
    and latest_paid_provider_payment_id <> p_provider_payment_id
  then
    update public.subscription_billing_adjustments as adjustment
    set
      superseded_by_provider_payment_id =
        latest_paid_provider_payment_id,
      superseded_at = latest_paid_observed_at,
      updated_at = clock_timestamp()
    where adjustment.subscription_id = target_subscription_id
      and adjustment.provider = 'stripe'::billing_provider
      and adjustment.kind = 'refund'
      and adjustment.provider_adjustment_id = p_provider_adjustment_id
      and adjustment.status = 'refunded'
      and adjustment.superseded_at is null;
  end if;

  perform public.recompute_stripe_subscription_access(
    target_subscription_id,
    p_observed_at
  );

  return p_status;
end;
$$;

create or replace function public.reconcile_stripe_subscription_paid_payment(
  p_provider_subscription_id text,
  p_provider_payment_id text,
  p_observed_at timestamptz default clock_timestamp()
)
returns membership_tier
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  effective_tier membership_tier;
  latest_paid_observed_at timestamptz;
  latest_paid_provider_payment_id text;
  target_subscription_id uuid;
  subscription_user_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_provider_subscription_id is null
    or btrim(p_provider_subscription_id) = ''
    or length(btrim(p_provider_subscription_id)) > 255
  then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;
  if p_provider_payment_id is null
    or btrim(p_provider_payment_id) = ''
    or length(btrim(p_provider_payment_id)) > 255
  then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_observed_at is null then
    raise exception 'payment_observed_at_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.stripe-subscription:' || p_provider_subscription_id,
      0
    )
  );

  select
    subscription.id,
    subscription.user_id,
    subscription.latest_paid_provider_payment_id,
    subscription.latest_paid_observed_at
  into
    target_subscription_id,
    subscription_user_id,
    latest_paid_provider_payment_id,
    latest_paid_observed_at
  from public.subscriptions as subscription
  where subscription.provider = 'stripe'::billing_provider
    and subscription.provider_subscription_id = p_provider_subscription_id;

  if target_subscription_id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(subscription_user_id::text, 0));

  if latest_paid_observed_at is null
    or p_observed_at > latest_paid_observed_at
    or (
      p_observed_at = latest_paid_observed_at
      and p_provider_payment_id > latest_paid_provider_payment_id
    )
  then
    update public.subscriptions as subscription
    set
      latest_paid_provider_payment_id = p_provider_payment_id,
      latest_paid_observed_at = p_observed_at
    where subscription.id = target_subscription_id;

    latest_paid_provider_payment_id := p_provider_payment_id;
    latest_paid_observed_at := p_observed_at;
  end if;

  update public.subscription_billing_adjustments as adjustment
  set
    superseded_by_provider_payment_id = latest_paid_provider_payment_id,
    superseded_at = latest_paid_observed_at,
    updated_at = clock_timestamp()
  where adjustment.subscription_id = target_subscription_id
    and adjustment.provider = 'stripe'::billing_provider
    and adjustment.kind = 'refund'
    and adjustment.status = 'refunded'
    and adjustment.blocks_access
    and adjustment.superseded_at is null
    and adjustment.provider_payment_id <>
      latest_paid_provider_payment_id
    and adjustment.observed_at < latest_paid_observed_at;

  effective_tier := public.recompute_stripe_subscription_access(
    target_subscription_id,
    latest_paid_observed_at
  );

  return effective_tier;
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

alter table public.subscription_billing_adjustments enable row level security;
alter table public.stripe_customer_reconciliation_tokens
enable row level security;

drop policy if exists
"subscription_billing_adjustments_select_own_or_admin"
on public.subscription_billing_adjustments;
create policy "subscription_billing_adjustments_select_own_or_admin"
on public.subscription_billing_adjustments for select
using (
  public.has_role('admin'::user_role)
  or exists (
    select 1
    from public.subscriptions as subscription
    where subscription.id =
        subscription_billing_adjustments.subscription_id
      and subscription.user_id = auth.uid()
  )
);

grant all privileges on table
public.subscription_billing_adjustments to service_role;
grant select on table
public.subscription_billing_adjustments to authenticated;
revoke insert, update, delete on table
public.subscription_billing_adjustments from authenticated;
revoke all privileges on table
public.stripe_customer_reconciliation_tokens
from public, anon, authenticated, service_role;

revoke all on function public.recompute_stripe_subscription_access(
  uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.sync_stripe_subscription_adjustment(
  text, text, text, text, text, integer, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription_adjustment(
  text, text, text, text, text, integer, text, timestamptz
) to service_role;
revoke all on function public.reconcile_stripe_subscription_paid_payment(
  text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.reconcile_stripe_subscription_paid_payment(
  text, text, timestamptz
) to service_role;
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
revoke all on function public.get_phase2_billing_schema_readiness()
from public, anon, authenticated;
grant execute on function public.get_phase2_billing_schema_readiness()
to service_role;
