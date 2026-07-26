alter table public.office_hour_sessions
add column if not exists updated_at timestamptz not null default now();

alter table public.office_hour_sessions
add column if not exists revision bigint not null default 1;

alter table public.office_hour_sessions
drop constraint if exists office_hour_sessions_revision_positive;
alter table public.office_hour_sessions
add constraint office_hour_sessions_revision_positive check (revision > 0);

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

drop trigger if exists office_hours_track_revision on public.office_hour_sessions;
create trigger office_hours_track_revision
before update on public.office_hour_sessions
for each row execute function public.track_office_hour_revision();

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

revoke insert, update, delete on table public.office_hour_sessions from authenticated;

revoke all on function public.upsert_office_hour(
  uuid, text, timestamptz, text, text, text, bigint
) from public;
grant execute on function public.upsert_office_hour(
  uuid, text, timestamptz, text, text, text, bigint
) to authenticated;

revoke all on function public.delete_office_hour(uuid, bigint) from public;
grant execute on function public.delete_office_hour(uuid, bigint) to authenticated;
