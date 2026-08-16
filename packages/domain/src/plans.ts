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
    name: "Full Access",
    price: 99,
    billingType: "one_time",
    stripePriceLookupKey: "full_access_once",
    description:
      "One payment for the complete library, every digital product, live support, and all member benefits.",
    featured: true,
    entitlements: [
      "content.basic",
      "content.all",
      "library.case_studies",
      "library.templates",
      "monthly.updates",
      "office_hours.join",
      "community.vip_access",
      "contact.unlock",
      "product.digital"
    ]
  }
];

export const marketingHighlights = [
  "Brand-first editorial membership",
  "Role-based content unlocking",
  "Stripe on web, IAP on mobile",
  "Admin-managed content, templates, and events"
] as const;

const wealthWithoutDriftPreview = [
  "Most money drift does not begin with one dramatic mistake. It begins when small decisions remain open for too long: a subscription no one uses, a savings transfer that never became automatic, a family goal that sounds important but never reaches the calendar.",
  "This reset is designed for one focused 90-minute session. You will not rebuild your entire financial life. You will identify the decisions creating the most drag, connect them to what matters now, and leave with a short list of actions for the next 30 days.",
  "Before you begin, gather the last two months of bank and card activity, your recurring-bill list, a blank sheet of paper, and any calendar shared with the people affected by your choices. Put your phone on Do Not Disturb. The goal is not perfect accounting. It is to turn vague pressure into a few visible decisions.",
  "Start by drawing three columns: Keep, Change, and Decide Later. Write each open money decision on one line, without solving it yet. Include commitments of time and attention as well as dollars. A cheap obligation that creates weekly friction may deserve attention before a larger expense that is working exactly as intended."
].join("\n\n");

const wealthWithoutDriftBody = [
  "## What this reset is for",
  "Most money drift does not begin with one dramatic mistake. It begins when small decisions remain open for too long: a subscription no one uses, a savings transfer that never became automatic, a family goal that sounds important but never reaches the calendar. Each item seems manageable alone. Together, they create a background feeling that money is happening to you instead of being directed by you.",
  "This reset is designed for one focused 90-minute session. You will not rebuild your entire financial life, optimize every account, or predict the next year. You will identify the decisions creating the most drag, connect them to what matters now, and leave with a short list of actions for the next 30 days. The finished result should fit on one page.",
  "Before you begin, gather the last two months of bank and card activity, your recurring-bill list, a blank sheet of paper, and any calendar shared with the people affected by your choices. Put your phone on Do Not Disturb. If exact numbers are difficult to find, use a reasonable range and mark it for follow-up. The goal is not perfect accounting. It is to turn vague pressure into a few visible decisions.",
  "## Minutes 0–15: build the decision inventory",
  "Draw three columns: **Keep**, **Change**, and **Decide later**. Write each open money decision on one line, without solving it yet. Include commitments of time and attention as well as dollars. A cheap obligation that creates weekly friction may deserve attention before a larger expense that is working exactly as intended.",
  "Scan your recent activity and recurring bills. Look for purchases you postponed evaluating, renewals you meant to cancel, savings goals without a transfer, debt payments that still rely on memory, and household costs that regularly surprise someone. Then add decisions that may not appear in a statement: an upcoming trip, a repair, support for a relative, a career change, or a school expense.",
  "Keep the inventory concrete. Replace “spend less” with “decide whether two restaurant nights each week still fit.” Replace “save more” with “choose a monthly transfer for the emergency reserve.” Replace “figure out insurance” with “compare the current deductible with the cash available for an emergency.” A decision you can name can be scheduled, assigned, or declined.",
  "Now mark each line with one of three symbols. Use a dot for decisions that affect only you, two dots for decisions that affect another person, and a small clock for anything with a real deadline. This prevents a private preference from being treated like a family agreement and keeps a quiet deadline from becoming an expensive surprise.",
  "## Minutes 15–30: test value against total cost",
  "Choose the eight items with the most financial or emotional weight. For each one, write two short answers: **What value does this create?** and **What does it cost in full?** Value may be safety, time, health, connection, learning, flexibility, or simple enjoyment. Cost includes the price, but it may also include maintenance, coordination, storage, attention, or the loss of another option.",
  "Do not use “responsible” or “irresponsible” as answers. Those labels hide the tradeoff. A costly convenience can be worthwhile during a demanding season. A low-cost habit can be poor value when it adds clutter or repeated guilt. The useful question is whether the exchange still supports the life you are currently living.",
  "Next, give each item a simple value-to-cost result: **clear yes**, **clear no**, or **needs a condition**. A condition makes an uncertain choice testable. You might keep a service if it replaces two other expenses, continue an activity if it is used twice this month, or delay a purchase until the emergency reserve reaches a named amount.",
  "Look for mismatches between your stated priorities and your calendar or cash flow. If family time matters but every weekend is crowded with costly obligations, the issue may be schedule design rather than a spending category. If flexibility matters but fixed commitments keep rising, the next useful move may be reducing one recurring obligation instead of chasing a higher return.",
  "## Minutes 30–50: map cash-flow commitments",
  "On a fresh section of the page, write monthly take-home income as a range if it varies. Under it, list four groups: **essential commitments**, **future commitments**, **flexible living**, and **unassigned margin**. Essential commitments cover the bills and obligations that keep life functioning. Future commitments include savings, debt reduction beyond minimums, and known upcoming costs. Flexible living covers choices that can move from month to month. Unassigned margin is the money not already promised.",
  "The groups are not moral rankings. They are a visibility tool. The same expense can sit in different groups for different households. What matters is that every recurring promise has a place and that the total does not depend on an unusually good month.",
  "Circle any commitment that is both recurring and still manually remembered. These are strong candidates for automation or a calendar trigger. Put a box around any annual or irregular cost that has no monthly contribution. Divide the expected amount by the number of months remaining, then decide whether the result belongs in the next 30-day plan.",
  "If the page shows little or no margin, avoid trying to solve ten categories at once. Identify one structural commitment and one flexible pattern to review. Structural changes may take longer but can create durable room. Flexible changes can create immediate feedback. Pairing one of each is usually more realistic than an aggressive temporary cut across everything.",
  "Now run a pressure test. Ask what happens if income arrives late, a bill is 20 percent higher, or a planned expense moves forward by one month. You are not forecasting every emergency. You are checking whether the current plan has any tolerance. If one small change breaks the month, preserving margin becomes a decision in its own right.",
  "## Minutes 50–65: hold the family conversation",
  "If another person shares the consequences, do not present the page as a verdict. Start with observations: “These are the commitments I found, these are the deadlines, and these two items seem to be creating the most pressure.” Then ask what they see differently. A useful conversation separates facts, preferences, and fears rather than arguing about all three at once.",
  "Use three prompts. First: **What are we protecting in the next 90 days?** Second: **Which commitment no longer matches this season?** Third: **What would make the plan feel fair enough to follow?** The word “enough” matters. A plan that requires one person to absorb every inconvenience is unlikely to survive contact with ordinary life.",
  "When priorities conflict, write both before choosing. One person may value a larger cash buffer while another values a planned experience. The job is not to prove which value is correct. It is to design a condition both people can understand, such as booking after a reserve threshold is reached or choosing a lower-cost version that does not delay another shared goal.",
  "Assign ownership for each follow-up. “We should call” is not an assignment. Write one name, one next action, and one date. If a child or relative is affected, decide what they need to know and what remains an adult responsibility. Transparency should reduce uncertainty, not transfer financial anxiety to someone who cannot act on it.",
  "## Minutes 65–80: choose the few decisions that matter",
  "Return to the inventory and select no more than five decisions for the next 30 days. A balanced list usually contains one item that protects stability, one that removes friction, one that advances a future goal, one conversation, and—when the budget allows—one choice that supports enjoyment or connection. Money direction should make life more intentional, not merely smaller.",
  "For each selected decision, use a four-part action line: **verb, amount or boundary, owner, date**. Examples include “Move $150 to the repair reserve on payday,” “Cancel the unused software before the 12th,” “Compare two insurance deductibles by Friday,” or “Choose the trip budget together on Sunday.” Specific lines are easier to finish and easier to review without blame.",
  "Decide what you are explicitly not changing this month. This protects attention from endless optimization. A Keep decision is still a decision when you have reviewed the tradeoff and chosen it on purpose. Write the reason in one sentence so you do not reopen the same question next week.",
  "Move everything else to Decide later with a trigger, not a vague delay. Use a date, a balance threshold, a contract renewal, or a life event. A decision without a trigger remains mental clutter. A triggered decision has a safe place to wait.",
  "## Minutes 80–90: install the 30-day review",
  "Put the five action lines on your calendar or task system while the session is still open. Schedule a 20-minute review 30 days from now. The review has only four questions: What did we complete? What changed? Which assumption was wrong? What is the next decision?",
  "Choose one small signal to watch during the month. It might be unassigned margin after each payday, the number of manual transfers still open, or whether a recurring service was actually used. A single signal can reveal whether the reset changed behavior without turning daily life into a financial dashboard.",
  "End by writing a one-sentence direction for the month. Keep it practical: “Protect the repair reserve and make the summer decision together,” or “Reduce recurring friction before adding a new goal.” This sentence is not a slogan. It is a filter for choices that appear before the next review.",
  "## When the page reveals a harder problem",
  "A 90-minute reset cannot solve insufficient income, unsafe debt, an urgent legal or tax issue, financial abuse, or a complex investment decision. If the inventory reveals a problem with serious consequences, the useful outcome may be identifying the right qualified professional, community resource, or trusted support person and making that contact.",
  "Soji provides general financial education, not individualized investment, legal, tax, or accounting advice. The examples here cannot account for your full circumstances, local rules, contractual obligations, or risk tolerance. Verify important information and seek qualified help when a decision requires advice specific to you.",
  "The reset has worked if the page is clearer than the worry you started with. You do not need certainty about every future choice. You need a small number of visible decisions, enough margin to respond to change, and a date when you will look again."
].join("\n\n");

export const sampleLibrary: ContentItem[] = [
  {
    id: "flagship-wealth-without-drift",
    slug: "wealth-without-drift",
    title: "Wealth Without Drift: A 90-Minute Decision Reset",
    summary:
      "A focused reset for turning open money questions into a values-led, cash-aware 30-day plan.",
    type: "article",
    visibility: "members_only",
    requiredEntitlements: ["content.basic"],
    publishedAt: "2026-07-28T00:00:00.000Z",
    coverImage: "/covers/wealth-without-drift.webp",
    coverImageAlt:
      "Paper decision map, pencil, linen ledger, and ceramic dish in warm window light.",
    preview: wealthWithoutDriftPreview,
    tags: ["decision-making", "cash flow", "family", "30-day reset"],
    body: wealthWithoutDriftBody
  },
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
    tags: ["demo", "supporting", "audit"],
    body: [
      "## Compare remembered value",
      "A useful money audit starts with behavior, not spreadsheets. List the ten purchases from the last month that still feel worthwhile, then list the ten that disappeared from memory within a week.",
      "## Name the default to change",
      "The gap between those two lists is the first signal. It shows where money is producing confidence, convenience, or connection, and where it is simply leaking into default choices.",
      "## Choose one next move",
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
    tags: ["demo", "supporting", "budgeting"],
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
    tags: ["demo", "supporting", "negotiation"],
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
    tags: ["demo", "supporting", "tracking"],
    body: [
      "A useful wealth dashboard should answer three questions quickly: where are we now, what changed this month, and what decision needs attention next?",
      "The template separates net worth, cash runway, investments, debt, insurance, and open decisions so the dashboard stays practical instead of becoming a vanity spreadsheet.",
      "Full Access members get the downloadable workbook, setup notes, and a quarterly review checklist."
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
    tags: ["demo", "supporting", "scripts"],
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
    id: "case-study-single",
    slug: "case-study-single",
    title: "单篇真实录取案例",
    summary:
      "解锁一篇真实录取案例，聚焦一个具体申请问题，看清背景、选择与结果之间的关系。",
    price: 5,
    priceLabel: "$5",
    entitlement: "product.case_study_single",
    bullets: [
      "一次性解锁 1 篇案例",
      "围绕真实客户问题展开分析",
      "查看背景、定位与文书思路",
      "购买后保留账号访问权"
    ]
  },
  {
    id: "case-study-collection",
    slug: "case-study-collection",
    title: "55篇真实录取案例合集",
    summary:
      "一次性解锁全部55篇案例，系统覆盖 Gap、转学、退学、第二本科与文书叙事等高频问题。",
    price: 99,
    priceLabel: "$99",
    entitlement: "product.digital",
    bullets: [
      "一次性解锁全部 55 篇案例",
      "覆盖非传统背景与专业匹配问题",
      "集中梳理申请定位与故事线",
      "比单篇购买节省 $176"
    ]
  }
];

export function getPlanByTier(tier: MembershipTier) {
  if (tier === "free") {
    return null;
  }

  // tier_2 and tier_3 remain valid database values for old records. They
  // resolve to the single current offer until the data migration completes.
  return membershipPlans[0] ?? null;
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
  // Legacy tier values are normalized by subscription sync and migrations.
  // Do not grant access from a stale profile alone.
  return tier === "tier_1" ? membershipPlans[0]?.entitlements ?? [] : [];
}
