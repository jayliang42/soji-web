alter table public.purchases add column if not exists dispute_id text;
alter table public.purchases add column if not exists dispute_status text;
alter table public.purchases add column if not exists dispute_observed_at timestamptz;

alter table public.purchases drop constraint if exists purchases_dispute_state_check;
alter table public.purchases add constraint purchases_dispute_state_check check (
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

revoke all on function public.sync_stripe_product_dispute(
  text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_dispute(
  text, text, text, timestamptz
) to service_role;

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

drop policy if exists "product_assets_select_buyer_or_publisher" on public.product_assets;
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
