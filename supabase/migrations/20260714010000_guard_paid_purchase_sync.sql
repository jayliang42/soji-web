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

  if p_status is null or p_status not in ('paid', 'no_payment_required') then
    raise exception 'purchase_payment_not_complete' using errcode = '23514';
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
