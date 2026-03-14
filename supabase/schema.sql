create extension if not exists "pgcrypto";

create type membership_tier as enum ('free', 'tier_1', 'tier_2', 'tier_3');
create type user_role as enum ('member', 'editor', 'admin');
create type content_type as enum (
  'article',
  'case_study',
  'template',
  'monthly_update',
  'product',
  'office_hour_session'
);
create type visibility as enum ('public', 'members_only', 'purchase_required');
create type billing_provider as enum ('stripe', 'app_store', 'play_store');

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
  created_at timestamptz not null default now()
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
  stripe_price_id text,
  entitlement_id text references entitlements (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
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

create table if not exists office_hour_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  signup_url text not null,
  replay_url text,
  required_entitlement_id text references entitlements (id),
  created_at timestamptz not null default now()
);
