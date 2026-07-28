import type {
  ContentItem,
  EntitlementKey,
  MembershipPlan,
  MembershipTier,
  OfficeHourSession,
  ProductOffer
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
    id: "public-1",
    slug: "first-money-audit",
    title: "The First Money Audit",
    summary:
      "A free starting point for finding the purchases, habits, and family assumptions shaping your money.",
    type: "article",
    visibility: "public",
    requiredEntitlements: [],
    publishedAt: "2026-03-08",
    coverImageAlt: "",
    preview:
      "Start by comparing the purchases you still value with the ones you barely remember.",
    tags: ["free", "audit"],
    body: [
      "A useful money audit starts with behavior, not spreadsheets. List the ten purchases from the last month that still feel worthwhile, then list the ten that disappeared from memory within a week.",
      "The gap between those two lists is the first signal. It shows where money is producing confidence, convenience, or connection, and where it is simply leaking into default choices.",
      "Members get the full worksheet version with review prompts, partner conversation scripts, and a monthly reset template."
    ].join("\n\n")
  },
  {
    id: "article-1",
    slug: "money-reset-ritual",
    title: "Money Reset Ritual",
    summary:
      "A practical monthly reset process for intentional spending, tracking, and family planning.",
    type: "article",
    visibility: "members_only",
    requiredEntitlements: ["content.basic"],
    publishedAt: "2026-03-01",
    coverImageAlt: "",
    preview:
      "Begin with four labels for the last thirty days: keep, reduce, replace, or investigate.",
    tags: ["mindset", "budgeting"],
    body: [
      "The reset starts with a simple rule: every dollar should either support the life you are building or teach you something about the life you do not want.",
      "Review the last thirty days by category, then mark each category as keep, reduce, replace, or investigate. The point is not guilt. The point is pattern recognition.",
      "For couples or families, run the same review together and separate facts from stories. A high grocery bill may be a planning issue, a values issue, or simply the cost of a season with less time.",
      "The member worksheet includes a monthly agenda, a five-minute partner script, and a decision log for the next reset."
    ].join("\n\n")
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
    coverImageAlt: "",
    preview:
      "The strongest preparation combined business outcomes, peer benchmarks, and one clean alternative.",
    tags: ["career", "negotiation"],
    body: [
      "This case study follows a high-leverage salary conversation from preparation through close. The strongest move was not the opening number; it was the candidate's evidence file.",
      "Before the conversation, they wrote down three business outcomes, two peer benchmarks, and one clean alternative if the offer stayed flat. That preparation made the ask feel calm instead of performative.",
      "The full member version includes the exact email, the live-call objection map, and a post-call follow-up script."
    ].join("\n\n")
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
    coverImageAlt: "",
    preview:
      "A useful dashboard answers where you are, what changed, and which decision needs attention next.",
    tags: ["templates", "tracking"],
    body: [
      "A useful wealth dashboard should answer three questions quickly: where are we now, what changed this month, and what decision needs attention next?",
      "The template separates net worth, cash runway, investments, debt, insurance, and open decisions so the dashboard stays practical instead of becoming a vanity spreadsheet.",
      "Tier 2 members get the downloadable workbook, setup notes, and a quarterly review checklist."
    ].join("\n\n")
  },
  {
    id: "update-1",
    slug: "march-2026-update-pack",
    title: "March 2026 Update Pack",
    summary:
      "A monthly drop with revised prompts, budget notes, and new scripts for family money conversations.",
    type: "monthly_update",
    visibility: "members_only",
    requiredEntitlements: ["monthly.updates"],
    publishedAt: "2026-03-10",
    coverImageAlt: "",
    preview:
      "This month turns broad money goals into smaller decisions a family can make this week.",
    tags: ["monthly", "scripts"],
    body: [
      "This month's update is focused on making money conversations less vague. The theme is replacing big abstract goals with smaller decisions that can be made this week.",
      "Inside the full pack: a revised reset checklist, three partner prompts, a new kids-and-money conversation guide, and a short script for saying no to expensive social plans without making it awkward."
    ].join("\n\n")
  }
];

export const officeHourSessions: OfficeHourSession[] = [
  {
    id: "oh-1",
    title: "June Office Hour: Family Money Decisions",
    startsAt: "2026-06-24T19:00:00.000Z",
    signupUrl: "https://example.com/office-hour",
    replayUrl: "https://example.com/replay",
    requiredEntitlements: ["office_hours.join"]
  }
];

export const productOffers: ProductOffer[] = [
  {
    id: "wealth-dashboard-template-pack",
    slug: "wealth-dashboard-template-pack",
    title: "Wealth Dashboard Template Pack",
    summary:
      "A standalone workbook for tracking net worth, cash runway, debt, insurance, and monthly decisions.",
    price: 79,
    priceLabel: "$79",
    entitlement: "product.digital",
    bullets: [
      "Downloadable personal wealth dashboard structure",
      "Monthly and quarterly review checklist",
      "Decision log for family money conversations",
      "Works as a standalone purchase or member bonus"
    ]
  },
  {
    id: "family-money-scripts",
    slug: "family-money-scripts",
    title: "Family Money Scripts",
    summary:
      "Conversation prompts for partners, parents, and kids when the money topic is important but delicate.",
    price: 49,
    priceLabel: "$49",
    entitlement: "product.digital",
    bullets: [
      "Scripts for partner planning conversations",
      "Prompts for kids and allowance decisions",
      "Boundary-setting language for social spending",
      "Short enough to use before a real conversation"
    ]
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
