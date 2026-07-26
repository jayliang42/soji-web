do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(btrim(email))
    having count(*) > 1
  ) then
    raise exception 'profiles_email_normalization_conflict';
  end if;
end;
$$;

update public.profiles
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

alter table public.profiles
drop constraint if exists profiles_email_canonical_check;

alter table public.profiles
add constraint profiles_email_canonical_check check (
  email <> ''
  and email = lower(btrim(email))
  and length(email) <= 320
);

revoke insert, update, delete on table public.profiles from authenticated;

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop function if exists public.profile_tier_unchanged(uuid, public.membership_tier);

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

create or replace function public.bootstrap_first_admin(p_target_email text)
returns table (
  target_user_id uuid,
  previous_role public.user_role,
  assigned_role public.user_role,
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
  previous_access_role public.user_role;
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
    select 1 from public.user_roles where role = 'admin'::public.user_role
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
      where user_id = selected_user_id and role = 'editor'::public.user_role
    ) then 'editor'::public.user_role
    else 'member'::public.user_role
  end;

  insert into public.user_roles (user_id, role)
  values (selected_user_id, 'member'::public.user_role)
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_id = selected_user_id
    and role in ('editor'::public.user_role, 'admin'::public.user_role);

  insert into public.user_roles (user_id, role)
  values (selected_user_id, 'admin'::public.user_role);

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
    'admin'::public.user_role,
    'first_admin_bootstrap',
    event_created_at
  );

  return query select
    selected_user_id,
    previous_access_role,
    'admin'::public.user_role,
    event_created_at;
end;
$$;
