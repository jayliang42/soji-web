alter table public.purchases
add column if not exists status_observed_at timestamptz;

update public.purchases
set status_observed_at = created_at
where status_observed_at is null;

alter table public.purchases
alter column status_observed_at set default now();
alter table public.purchases
alter column status_observed_at set not null;

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
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('paid', 'no_payment_required') then
    raise exception 'purchase_payment_not_complete' using errcode = '23514';
  end if;

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

  select purchase.status
  into effective_status
  from public.purchases as purchase
  where purchase.provider_payment_id = p_provider_payment_id;

  if effective_status in ('paid', 'no_payment_required', 'partially_refunded') then
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

  select purchase.user_id, product.entitlement_id, purchase.status,
    purchase.status_observed_at
  into purchase_user_id, purchase_entitlement_id, current_status,
    current_observed_at
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
      and product_id = (
        select product_id
        from public.purchases
        where provider_payment_id = p_provider_payment_id
      );
  end if;

  return p_status;
end;
$$;

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

create or replace function public.claim_product_checkout(
  p_product_id uuid,
  p_request_id uuid
)
returns table (outcome text, expires_at timestamptz)
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
    from public.purchases as purchase
    where purchase.user_id = current_user_id
      and purchase.product_id = p_product_id
      and purchase.status in ('paid', 'no_payment_required', 'partially_refunded')
  ) then
    return query select 'already_purchased'::text, null::timestamptz;
    return;
  end if;

  insert into public.product_checkout_intents (
    user_id, product_id, request_id, expires_at, created_at, updated_at
  ) values (
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
    from public.product_checkout_intents as intent
    where intent.user_id = current_user_id
      and intent.product_id = p_product_id;

    return query select 'checkout_in_progress'::text, claim_expires_at;
    return;
  end if;

  return query select 'claimed'::text, claim_expires_at;
end;
$$;

revoke all on function public.claim_product_checkout(uuid, uuid) from public;
grant execute on function public.claim_product_checkout(uuid, uuid) to authenticated;
grant execute on function public.claim_product_checkout(uuid, uuid) to service_role;

drop policy if exists "product_assets_select_buyer_or_publisher"
on public.product_assets;
create policy "product_assets_select_buyer_or_publisher"
on public.product_assets for select
using (
  public.is_editor_or_admin()
  or exists (
    select 1
    from public.purchases
    where purchases.product_id = product_assets.product_id
      and purchases.user_id = auth.uid()
      and purchases.status in ('paid', 'no_payment_required', 'partially_refunded')
  )
);
