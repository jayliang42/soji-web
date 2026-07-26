alter table public.role_change_events
alter column actor_user_id drop not null;

alter table public.role_change_events
add column if not exists change_source text not null default 'admin_rpc';

alter table public.role_change_events
drop constraint if exists role_change_events_actor_source_check;

alter table public.role_change_events
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
  where lower(email) = normalized_email;

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

revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;
