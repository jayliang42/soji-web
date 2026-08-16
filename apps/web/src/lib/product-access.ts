import type { EntitlementKey } from "@soji/types";

const FULL_PRODUCT_ACCESS = "product.digital" satisfies EntitlementKey;

export function hasProductAccess(
  entitlements: EntitlementKey[],
  productEntitlement: EntitlementKey
) {
  return (
    entitlements.includes(FULL_PRODUCT_ACCESS) ||
    entitlements.includes(productEntitlement)
  );
}

export function hasActiveProductGrant(
  grants: Array<{ entitlement_id: string; ends_at: string | null }>,
  productEntitlement: string,
  now = Date.now()
) {
  return grants.some(
    (grant) =>
      (grant.entitlement_id === FULL_PRODUCT_ACCESS ||
        grant.entitlement_id === productEntitlement) &&
      (!grant.ends_at || Date.parse(grant.ends_at) > now)
  );
}
