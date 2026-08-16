begin;

create or replace function public.release_product_checkout(p_product_slug text)
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

  delete from public.product_checkout_intents as intent
  using public.products as product
  where intent.user_id = current_user_id
    and intent.product_id = product.id
    and product.slug = p_product_slug;

  return found;
end;
$$;

revoke all on function public.release_product_checkout(text) from public;
grant execute on function public.release_product_checkout(text) to authenticated;
grant execute on function public.release_product_checkout(text) to service_role;

commit;
