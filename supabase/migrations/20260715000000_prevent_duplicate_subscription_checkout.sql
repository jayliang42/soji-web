create table if not exists public.subscription_checkout_intents (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  request_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_checkout_intents_expiry_check check (expires_at > created_at)
);

alter table public.subscription_checkout_intents enable row level security;

revoke all on table public.subscription_checkout_intents from anon, authenticated;
grant all on table public.subscription_checkout_intents to service_role;

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
      and s.provider = 'stripe'::public.billing_provider
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

revoke all on function public.claim_subscription_checkout(uuid) from public;
grant execute on function public.claim_subscription_checkout(uuid) to authenticated;
grant execute on function public.claim_subscription_checkout(uuid) to service_role;
