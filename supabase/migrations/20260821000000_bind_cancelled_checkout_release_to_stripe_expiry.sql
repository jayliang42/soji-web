begin;

-- The old release functions removed whichever retry guard was current for the
-- signed-in user. Bind release to the immutable Stripe Checkout expiry instead,
-- so returning from an older Session cannot delete a newer claim.
drop function if exists public.release_subscription_checkout();
drop function if exists public.release_product_checkout(text);

create or replace function public.release_subscription_checkout(
  p_checkout_expires_at timestamptz
)
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

  if p_checkout_expires_at is null then
    raise exception 'checkout_expiry_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('soji.subscription-checkout:' || current_user_id::text, 0)
  );

  delete from public.subscription_checkout_intents
  where user_id = current_user_id
    and expires_at between
      p_checkout_expires_at - interval '1 second'
      and p_checkout_expires_at + interval '1 second';

  return found;
end;
$$;

create or replace function public.release_product_checkout(
  p_product_slug text,
  p_checkout_expires_at timestamptz
)
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

  if p_product_slug is null or p_checkout_expires_at is null then
    raise exception 'checkout_release_parameters_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'soji.product-checkout:' || current_user_id::text || ':' || p_product_slug,
      0
    )
  );

  delete from public.product_checkout_intents as intent
  using public.products as product
  where intent.user_id = current_user_id
    and intent.product_id = product.id
    and product.slug = p_product_slug
    and intent.expires_at between
      p_checkout_expires_at - interval '1 second'
      and p_checkout_expires_at + interval '1 second';

  return found;
end;
$$;

revoke all on function public.release_subscription_checkout(timestamptz)
from public, anon;
revoke all on function public.release_product_checkout(text, timestamptz)
from public, anon;

grant execute on function public.release_subscription_checkout(timestamptz)
to authenticated, service_role;
grant execute on function public.release_product_checkout(text, timestamptz)
to authenticated, service_role;

commit;
