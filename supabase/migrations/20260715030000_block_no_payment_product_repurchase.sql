create or replace function public.claim_product_checkout(
  p_product_id uuid,
  p_request_id uuid
)
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
    from public.purchases p
    where p.user_id = current_user_id
      and p.product_id = p_product_id
      and p.status in ('paid', 'no_payment_required')
  ) then
    return query select 'already_purchased'::text, null::timestamptz;
    return;
  end if;

  insert into public.product_checkout_intents (
    user_id,
    product_id,
    request_id,
    expires_at,
    created_at,
    updated_at
  )
  values (
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
    from public.product_checkout_intents intent
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
