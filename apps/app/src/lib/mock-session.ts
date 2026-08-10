import { getDefaultEntitlements, membershipPlans, sampleLibrary } from "@soji/domain";

export function getAppSession() {
  const tier = "tier_1" as const;
  return {
    user: {
      name: "Soji Demo Member",
      email: "member@soji.club",
      tier
    },
    plans: membershipPlans,
    entitlements: getDefaultEntitlements(tier),
    library: sampleLibrary
  };
}
