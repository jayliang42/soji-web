begin;

-- A cancelled Stripe Checkout should release the user's retry guard immediately.
create or replace function public.release_subscription_checkout()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.subscription_checkout_intents
  where user_id = current_user_id;

  return found;
end;
$$;

revoke all on function public.release_subscription_checkout() from public;
grant execute on function public.release_subscription_checkout() to authenticated;
grant execute on function public.release_subscription_checkout() to service_role;

commit;
