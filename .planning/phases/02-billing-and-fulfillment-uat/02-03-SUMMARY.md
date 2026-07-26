---
phase: 02-billing-and-fulfillment-uat
plan: "03"
subsystem: ui
tags: [nextjs, react, tailwind, vitest, accessibility, stripe, billing]

requires:
  - phase: 02-01
    provides: Normalized subscription adjustment state and owner-readable billing history
  - phase: 02-02
    provides: Exact Stripe adjustment dispatch and paid-evidence reconciliation
provides:
  - Owner-scoped subscription adjustment summaries without provider identifiers
  - Exact fail-closed membership and product billing presentation
  - Portal and download actions gated by authoritative local state
  - Geometry-preserving accessible Account loading placeholders
  - Focused server-rendered truth, loading, return-query, and delivery tests
affects:
  - 02-07 through 02-09 provider-backed Account UAT
  - Phase 4 responsive and accessibility acceptance
  - BILL-03
  - BILL-04
  - BILL-05

tech-stack:
  added: []
  patterns:
    - Pure typed customer-presentation mapping over normalized billing state
    - Neutral route loading geometry with one hidden polite status
    - Border-separated responsive billing records with semantic dates

key-files:
  created:
    - apps/web/src/lib/account-subscriptions.ts
    - apps/web/src/app/account/loading.tsx
    - apps/web/src/components/billing-portal-button.tsx
    - apps/web/tests/account-subscriptions.test.ts
    - apps/web/tests/account-billing-readiness-page.test.tsx
  modified:
    - apps/web/src/app/account/page.tsx

key-decisions:
  - "Account maps only adjustment kind, status, access block, observation time, and supersession; provider adjustment and payment identifiers never cross the customer boundary."
  - "Lost disputes, open disputes, full refunds, partial refunds, and underlying subscription status are presented in one explicit priority order, with unknown states unavailable."
  - "Canceled and expired subscriptions never expose Portal management, and a Checkout return remains informational until durable Account state confirms access."

patterns-established:
  - "Customer state mapper: exact labels and explanations are returned from a pure function; raw provider enums are never formatted for display."
  - "Loading truth: preserve tier, subscription, and purchase geometry while withholding Free, access, and empty-state assertions."

requirements-completed: [BILL-03, BILL-04, BILL-05]

duration: 58min
completed: 2026-07-26
---

# Phase 2 Plan 3: Authoritative Account Billing Truth Summary

**Customer-safe membership and product records now reflect durable billing authority, with exact reversal priority, bounded actions, semantic dates, and neutral accessible loading geometry**

## Performance

- **Duration:** 58 min
- **Started:** 2026-07-26T18:05:40Z
- **Completed:** 2026-07-26T19:03:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added an owner-scoped nested adjustment query that omits provider payment and adjustment identifiers while preserving the fields needed for deterministic customer truth.
- Implemented exact membership labels for eligible, payment-problem, canceled, unknown, dispute, and refund combinations, including resolved/partial states over ineligible subscriptions.
- Rebuilt Account billing records as responsive border-separated rows with one primary state, one access outcome, semantic dates, contextual copy, and at most one authoritative action.
- Enforced product delivery presentation for paid, delayed, asset-unavailable, partial/full refund, and dispute open/win/loss states while retaining per-request download authorization.
- Added an accessible route loading state with stable Account geometry and exactly one hidden `Loading account billing…` status, without false tier, access, or empty-state flashes.
- Passed the full Web regression gate with 508 tests plus strict TypeScript and ESLint.

## Task Commits

Each task followed RED then GREEN:

1. **Task 1 RED: Define account membership truth contract** - `0c49274` (test)
2. **Task 1 GREEN: Map authoritative membership billing truth** - `1e3b39f` (feat)
3. **Task 2 RED: Define truthful Account rendering contract** - `e7d23cb` (test)
4. **Task 2 GREEN: Render truthful Account billing states** - `97a7858` (feat)

## Files Created/Modified

- `apps/web/src/lib/account-subscriptions.ts` - Owner-scoped adjustment mapping, exact Portal manageability, and pure subscription presentation.
- `apps/web/src/app/account/page.tsx` - Responsive authoritative membership/product rows, semantic dates, safe return banner, and exact actions.
- `apps/web/src/app/account/loading.tsx` - Geometry-preserving neutral Account placeholders with one accessible loading announcement.
- `apps/web/src/components/billing-portal-button.tsx` - Exact pending, helper, unavailable, and alert copy with a 44px responsive target.
- `apps/web/tests/account-subscriptions.test.ts` - Table-driven query, privacy, priority, unknown-state, and Portal eligibility coverage.
- `apps/web/tests/account-billing-readiness-page.test.tsx` - Server-rendered loading, membership, purchase, return-query, failure, action, and semantic-date coverage.

## Decisions Made

- Customer presentation consumes normalized local billing evidence only. Provider IDs remain server/Admin evidence and are neither selected into the adjustment summary nor rendered.
- A subscription is manageable only when it is Stripe-backed, has a bound Customer, and is active, trialing, incomplete, past due, unpaid, paused, or canceling from an eligible state.
- Resolved disputes and partial refunds do not imply access. They defer to underlying eligibility, while lost/open disputes and current full-refund blocks retain higher priority.
- Product links are rendered only for eligible delivered states with an available private asset; the existing download route still reauthorizes owner, purchase state, dispute state, and asset on every request.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing typed fixtures for the new adjustment contract**

- **Found during:** Task 1 GREEN type-check
- **Issue:** The existing checkout-blocking fixture lacked the new required `billingAdjustments` field.
- **Fix:** Added an empty adjustment collection and expanded exact Portal eligibility coverage.
- **Files modified:** `apps/web/tests/account-subscriptions.test.ts`
- **Verification:** Focused subscription tests passed 25/25 and strict Web type-check passed.
- **Committed in:** `1e3b39f`

**2. [Rule 2 - Missing Critical] Completed stable Portal interaction copy and alert semantics**

- **Found during:** Task 2 Account integration
- **Issue:** The existing Portal control used a generic ASCII pending label, incomplete recovery copy, and routine status semantics for action failures.
- **Fix:** Added exact `Opening billing…`, helper and recovery messages, `aria-busy`, `role="alert"`, responsive 44px targets, and no provider error text.
- **Files modified:** `apps/web/src/components/billing-portal-button.tsx`
- **Verification:** Portal component tests passed 2/2, Account focused tests passed 42/42, and accessibility markup assertions passed.
- **Committed in:** `97a7858`

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking issue, 1 Rule 2 missing critical boundary)
**Impact on plan:** Both changes were required to keep the typed Account integration and stable fail-closed interaction contract complete. No new dependency, endpoint, provider mutation, or architecture was introduced.

## Issues Encountered

- The RED subscription test initially named the database full-refund status `fully_refunded`; it was corrected to the actual normalized `refunded` contract before GREEN.
- React server rendering preserves the JSX property spelling `dateTime` in static markup, so the semantic-date assertion was corrected without changing the rendered `<time>` behavior.
- The Account page was an explicit plan target but already contained a broad uncommitted Account implementation relative to HEAD. The task retained that working surface and committed the integrated Account result; no non-Account dirty changes were staged.
- A broader optional Playwright attempt encountered unrelated homepage/pricing axe timeouts and an obsolete canceled-subscription Portal expectation. Per the requested closeout gate, authoritative verification used the plan-focused server tests plus the full 508-test Web unit suite, type-check, and lint; no unrelated browser test was edited.

## Verification

- Subscription adjustment query/presentation: 25/25 passed in 0.89 seconds.
- Account, Checkout return, and product download contract: 42/42 passed in 1.35 seconds.
- Billing Portal component: 2/2 passed.
- Full Web suite: 76 files, 508/508 tests passed in 12.50 seconds.
- Strict route-aware Web TypeScript check: passed.
- Web ESLint: passed.
- Loading markup contains exactly `Loading account billing…` and excludes `Free`, `No access`, and both authoritative empty-state messages.
- HIGH threats T-02-05 and T-02-07 are covered by exact local-subscription Portal binding, manageable-state gating, per-request download authorization, provider-ID omission, explicit customer labels, and fail-closed unknown/loading states.
- No provider credentials, external mutations, production changes, new network endpoint, auth path, file-access boundary, or schema change were introduced.

## Known Stubs

None. The stable “not available” wording is intentional customer recovery copy, not placeholder data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-04 can build the Admin incident ledger while keeping customer-safe Account presentation separate from bounded operational identifiers.
- Plans 02-07 through 02-09 can observe these exact Account labels and actions during authorized Stripe test-mode UAT.
- Provider-backed Checkout, Portal, delivery, refund, and dispute evidence remains pending; repository tests did not promote live UAT rows to PASS.

## Self-Check: PASSED

- All six plan implementation/test artifacts exist.
- Task commits `0c49274`, `1e3b39f`, `e7d23cb`, and `97a7858` exist in git history.
- Both focused commands, the full Web suite, strict type-check, and lint pass.
- No known goal-blocking stubs or unplanned threat surfaces remain.

---
*Phase: 02-billing-and-fulfillment-uat*
*Completed: 2026-07-26*
