begin;

-- Supabase may retain explicit default grants for API roles even after PUBLIC
-- is revoked. Checkout claim/release RPCs require an authenticated auth.uid(),
-- so keep their executable surface aligned with that trust boundary.
revoke all on function public.claim_product_checkout(uuid, uuid)
from public, anon;
revoke all on function public.claim_subscription_checkout(uuid)
from public, anon;
revoke all on function public.release_product_checkout(text)
from public, anon;
revoke all on function public.release_subscription_checkout()
from public, anon;

grant execute on function public.claim_product_checkout(uuid, uuid)
to authenticated, service_role;
grant execute on function public.claim_subscription_checkout(uuid)
to authenticated, service_role;
grant execute on function public.release_product_checkout(text)
to authenticated, service_role;
grant execute on function public.release_subscription_checkout()
to authenticated, service_role;

commit;
