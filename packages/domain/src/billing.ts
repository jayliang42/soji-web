import type { MembershipTier } from "@soji/types";

export const activeSubscriptionStatuses = ["active", "trialing"] as const;

type SubscriptionState = {
  planId: MembershipTier;
  status: string;
};

const planRank: Record<MembershipTier, number> = {
  free: 0,
  tier_1: 1,
  tier_2: 2,
  tier_3: 3
};

export function isActiveSubscriptionStatus(status: string) {
  return activeSubscriptionStatuses.some((activeStatus) => activeStatus === status);
}

export function getEffectiveMembershipTier(
  subscriptions: readonly SubscriptionState[]
): MembershipTier {
  return subscriptions.reduce<MembershipTier>((currentTier, subscription) => {
    if (!isActiveSubscriptionStatus(subscription.status)) {
      return currentTier;
    }

    return planRank[subscription.planId] > planRank[currentTier]
      ? subscription.planId
      : currentTier;
  }, "free");
}
