import type {
  AdminMetric,
  ContentItem,
  EntitlementKey,
  MembershipPlan,
  MembershipTier,
  OfficeHourSession
} from "@soji/types";

export const membershipPlans: MembershipPlan[] = [
  {
    id: "tier_1",
    name: "Tier 1",
    monthlyPrice: 29,
    stripePriceLookupKey: "tier_1_monthly",
    description: "Monthly articles and the foundational content library.",
    entitlements: ["content.basic"]
  },
  {
    id: "tier_2",
    name: "Tier 2",
    monthlyPrice: 128,
    stripePriceLookupKey: "tier_2_monthly",
    description: "Full content, case studies, templates, and monthly update drops.",
    featured: true,
    entitlements: [
      "content.basic",
      "content.all",
      "library.case_studies",
      "library.templates",
      "monthly.updates"
    ]
  },
  {
    id: "tier_3",
    name: "Tier 3",
    monthlyPrice: 299,
    stripePriceLookupKey: "tier_3_monthly",
    description: "Everything in Tier 2 plus office hours and private group access.",
    entitlements: [
      "content.basic",
      "content.all",
      "library.case_studies",
      "library.templates",
      "monthly.updates",
      "office_hours.join",
      "community.vip_access",
      "contact.unlock"
    ]
  }
];

export const marketingHighlights = [
  "Brand-first editorial membership",
  "Role-based content unlocking",
  "Stripe on web, IAP on mobile",
  "Admin-managed content, templates, and events"
] as const;

export const sampleLibrary: ContentItem[] = [
  {
    id: "article-1",
    slug: "money-reset-ritual",
    title: "Money Reset Ritual",
    summary: "A practical monthly reset process for intentional spending and tracking.",
    type: "article",
    visibility: "members_only",
    requiredEntitlements: ["content.basic"],
    publishedAt: "2026-03-01",
    tags: ["mindset", "budgeting"],
    body: "Build a monthly rhythm around review, reflection, and action."
  },
  {
    id: "case-1",
    slug: "salary-negotiation-playbook",
    title: "Salary Negotiation Playbook",
    summary: "Annotated case study with scripts, objection handling, and outcomes.",
    type: "case_study",
    visibility: "members_only",
    requiredEntitlements: ["library.case_studies"],
    publishedAt: "2026-03-04",
    tags: ["career", "negotiation"],
    body: "Case-study-driven breakdown of a high-leverage salary conversation."
  },
  {
    id: "template-1",
    slug: "wealth-dashboard-template",
    title: "Wealth Dashboard Template",
    summary: "A reusable template for tracking net worth, goals, and monthly progress.",
    type: "template",
    visibility: "members_only",
    requiredEntitlements: ["library.templates"],
    publishedAt: "2026-03-06",
    tags: ["templates", "tracking"],
    body: "Downloadable dashboard template with setup instructions."
  }
];

export const officeHourSessions: OfficeHourSession[] = [
  {
    id: "oh-1",
    title: "March Office Hour: Pricing Your Expertise",
    startsAt: "2026-03-28T19:00:00.000Z",
    signupUrl: "https://example.com/office-hour",
    replayUrl: "https://example.com/replay",
    requiredEntitlements: ["office_hours.join"]
  }
];

export const adminMetrics: AdminMetric[] = [
  {
    label: "MRR",
    value: "$18,240",
    detail: "Projected recurring revenue across active subscriptions"
  },
  {
    label: "Members",
    value: "146",
    detail: "Combined across all tiers"
  },
  {
    label: "Products",
    value: "8",
    detail: "Standalone paid digital offers"
  }
];

export function getPlanByTier(tier: MembershipTier) {
  return membershipPlans.find((plan) => plan.id === tier) ?? null;
}

export function hasEntitlement(
  userEntitlements: EntitlementKey[],
  requiredEntitlements: EntitlementKey[]
) {
  if (requiredEntitlements.length === 0) {
    return true;
  }

  return requiredEntitlements.every((entitlement) =>
    userEntitlements.includes(entitlement)
  );
}

export function getDefaultEntitlements(tier: MembershipTier): EntitlementKey[] {
  return getPlanByTier(tier)?.entitlements ?? [];
}
