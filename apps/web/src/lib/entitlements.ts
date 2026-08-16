import type { EntitlementKey } from "@soji/types";

const entitlementLabels: Record<EntitlementKey, string> = {
  "community.vip_access": "Private member group",
  "contact.unlock": "Direct contact access",
  "content.all": "Complete editorial archive",
  "content.basic": "Foundational monthly essays",
  "library.case_studies": "Case study library",
  "library.templates": "Downloadable templates",
  "monthly.updates": "Monthly update drops",
  "office_hours.join": "Live office hours",
  "product.case_study_single": "Single case study access",
  "product.digital": "Digital product access"
};

export function getEntitlementLabel(entitlement: EntitlementKey) {
  return entitlementLabels[entitlement];
}

export function formatEntitlementList(entitlements: EntitlementKey[]) {
  return new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction"
  }).format(entitlements.map(getEntitlementLabel));
}
