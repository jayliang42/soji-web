---
phase: 03-launch-content-and-customer-policy
plan: "04"
subsystem: customer-policy
tags: [nextjs, stripe, policy, checkout, ui, accessibility]

requires:
  - phase: 02-billing-and-fulfillment-uat
    provides: Server-owned Checkout, billing delivery readiness, and authoritative refund/access behavior
provides:
  - Five canonical customer Support and policy pages with shared accessible layout
  - Validated public support destination and explicit owner/Stripe approval gates
  - Grouped global footer and purchase-adjacent membership/product disclosures
  - Fail-closed Checkout policy readiness and Stripe-hosted Terms acceptance
affects:
  - 03-05 launch readiness and evidence
  - Phase 2 provider-backed Checkout UAT
  - OPS-03

tech-stack:
  added: []
  patterns:
    - Public legal/support copy stays source-controlled while production approval remains an explicit server gate
    - Purchase terms appear beside the action and hosted consent remains provider-owned
    - Customer policy failure returns one stable public code without exposing internal readiness reasons

key-files:
  created:
    - apps/web/src/lib/customer-policy.ts
    - apps/web/src/components/policy-layout.tsx
    - apps/web/src/components/purchase-disclosure.tsx
    - apps/web/src/app/support/page.tsx
    - apps/web/src/app/privacy/page.tsx
    - apps/web/src/app/terms/page.tsx
    - apps/web/src/app/refund-policy/page.tsx
    - apps/web/src/app/financial-disclaimer/page.tsx
    - apps/web/tests/customer-policy.test.tsx
  modified:
    - apps/web/.env.example
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/sitemap.ts
    - apps/web/src/app/products/page.tsx
    - apps/web/src/components/plan-card.tsx
    - apps/web/src/app/api/checkout/subscription/route.ts
    - apps/web/src/app/api/checkout/product/route.ts
    - apps/web/tests/checkout-routes.test.ts

key-decisions:
  - "Checkout is policy-ready only when a durable non-placeholder support destination, explicit policy approval, and Stripe Dashboard Terms readiness are all true."
  - "Policy readiness is checked immediately after request-schema validation and before Stripe, Supabase, rate-limit, or checkout-claim work."
  - "Soji shows plain-language terms next to each purchase action while Stripe Checkout owns required Terms acceptance."
  - "Customer drafts describe only current Supabase, Stripe, session, support, logging, billing, refund, dispute, and educational behavior; no entity, address, jurisdiction, arbitration, or service promise is invented."

patterns-established:
  - "Policy trust path: canonical page -> global footer -> purchase-adjacent disclosure -> server readiness -> Stripe-hosted consent."
  - "External approval gate: repository tests prove structure and fail-closed behavior but cannot turn owner/legal or provider configuration into PASS."

requirements-completed: [OPS-03]

duration: 9min
completed: 2026-07-28
---

# Phase 3 Plan 4: Customer Policy and Checkout Trust Path Summary

**Soji now exposes truthful customer policies globally and beside every purchase action, while both Checkout routes fail closed until the support channel, owner approval, and Stripe-hosted Terms configuration are real**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-28T02:55:00Z
- **Completed:** 2026-07-28T03:04:20Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments

- Published Support, Privacy, Terms, Refund policy, and Financial disclaimer routes with unique metadata, one H1, sequential sections, updated dates, readable measure, table-of-contents navigation, and reciprocal links.
- Added exact validation for a durable HTTPS or mail support destination plus explicit `SOJI_POLICIES_APPROVED` and `STRIPE_TERMS_ACCEPTANCE_READY` gates.
- Rebuilt the footer into brand, Explore, and Support & policies groups and added all customer-policy routes to the public sitemap.
- Added exact recurring amount/cadence/cancellation/access disclosures to every membership card and one-time delivery/refund disclosures to every product card.
- Required a ready customer-policy configuration before any provider work and added Stripe-hosted Terms acceptance to both subscription and one-time Checkout Sessions.

## Task Commits

1. **Task 1 RED: Define customer policy and page contracts** - `b8e3f12` (test)
2. **Task 1 GREEN: Publish truthful customer policy drafts** - `7f37d0d` (feat)
3. **Task 2 RED: Define footer and purchase-trust contracts** - `bc9d36e` (test)
4. **Task 2 GREEN: Add the global and purchase-adjacent trust path** - `1aa072d` (feat)
5. **Task 3 RED: Define policy-gated Checkout and hosted consent** - `5aed635` (test)
6. **Task 3 GREEN: Require approved policy configuration** - `ba61828` (feat)
7. **Build fix: Narrow generated customer-policy routes** - `935e1e9` (fix)

## Files Created/Modified

- `apps/web/src/lib/customer-policy.ts` - Exact routes, support validation, approval flags, and stable readiness reasons.
- `apps/web/src/components/policy-layout.tsx` - Shared accessible long-form policy structure and reciprocal navigation.
- `apps/web/src/components/purchase-disclosure.tsx` - Membership and digital-product pre-payment truth blocks.
- `apps/web/src/app/{support,privacy,terms,refund-policy,financial-disclaimer}/page.tsx` - Product-truthful customer review drafts.
- `apps/web/src/app/layout.tsx` - Three-group responsive footer with 44px targets.
- `apps/web/src/app/sitemap.ts` - Canonical policy and support discovery routes.
- `apps/web/src/components/plan-card.tsx` and `apps/web/src/app/products/page.tsx` - Action-adjacent disclosures.
- `apps/web/src/app/api/checkout/{subscription,product}/route.ts` - Policy gate and Stripe-hosted Terms consent.
- `apps/web/tests/customer-policy.test.tsx` and Checkout/page suites - Configuration, copy, markup, non-bypass, and provider payload coverage.

## Decisions Made

- A mail support address is allowed only as a clean `mailto:` destination; HTTPS help desks are also allowed. Example domains, malformed values, credentials, local/private hosts, and unsupported protocols fail closed.
- The public `customer_policy_not_ready` response intentionally omits individual readiness reasons. Operators retain stable internal reason codes without exposing configuration details to callers.
- Policy pages remain useful and public when the owner inputs are absent, but payment initiation remains unavailable.
- No local consent checkbox was added; disclosure is adjacent and visible, while the canonical recorded acceptance is handled by Stripe Checkout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added disclosure at the reusable membership-card boundary**

- **Found during:** Task 2 implementation
- **Issue:** Rendering three exact price disclosures from the Pricing page would duplicate plan markup or separate the terms from each action.
- **Fix:** Added `PurchaseDisclosure` to `PlanCard`, the existing reusable action boundary.
- **Files modified:** `apps/web/src/components/plan-card.tsx`
- **Verification:** Pricing markup contains one exact amount/cadence disclosure and four policy links for each of `$29`, `$128`, and `$299`.
- **Committed in:** `1aa072d`

**2. [Rule 3 - Blocking] Updated the established Checkout rate-limit fixture for the new prerequisite**

- **Found during:** Task 3 regression
- **Issue:** Existing route tests correctly encountered the new default fail-closed policy state before reaching the behavior they intended to isolate.
- **Fix:** Mocked a ready policy configuration in that suite; dedicated tests retain the not-ready and client-bypass coverage.
- **Files modified:** `apps/web/tests/checkout-rate-limit-routes.test.ts`
- **Verification:** All 53 Checkout-focused tests pass.
- **Committed in:** `ba61828`

**3. [Rule 1 - Bug] Refreshed generated route types and narrowed footer link data**

- **Found during:** Production build
- **Issue:** Stale alternate Next.js type-generation directories intersected route declarations and rejected newly added policy literals during the build-only check.
- **Fix:** Regenerated local dev/E2E route types and typed footer link data using Next's `Route` contract.
- **Files modified:** `apps/web/src/app/layout.tsx`
- **Verification:** Production build discovers all five new routes and completes 37/37 static pages.
- **Committed in:** `935e1e9`

---

**Total deviations:** 3 auto-fixed (1 component integration, 1 test-fixture prerequisite, 1 generated-route typing issue)
**Impact on plan:** All changes were required to preserve adjacency, regression isolation, and production build correctness; scope and customer policy remain unchanged.

## Issues Encountered

- Next.js build-time typed routes combine multiple configured generated-type directories. Regenerating the dev and E2E variants resolved their stale view of the newly created routes; those generated artifacts remain ignored.

## Verification

- RED runs failed on missing pages/component, missing sitemap/footer/disclosures, absent policy gate, and absent Stripe consent.
- Plan-focused verification passed: 8 files, 76 tests.
- Full Web regression passed: 80 test files, 597 tests.
- Web ESLint and typecheck passed.
- Production Next.js build passed and emitted all five customer-policy routes across 37 generated pages.
- Both Checkout routes make no Stripe, Supabase, rate-limit, or claim call when policy readiness is false.
- Client-supplied `termsAccepted` is rejected by the strict payload schemas.
- Public drafts contain current cancellation, refund, privacy, and no-advice boundaries without fabricated entity, address, jurisdiction, arbitration, SLA, or outcome claims.

## User Setup Required

None during this plan. The exact durable support destination, business-owner/legal approval, and Stripe Dashboard canonical Terms configuration remain together in the single consolidated owner checkpoint.

## Next Phase Readiness

- Plan 03-02 can build the flagship reader experience independently.
- Plan 03-05 can reuse exact customer-policy readiness reasons and page routes for Admin readiness and evidence.
- Provider-backed Checkout remains intentionally closed until the consolidated owner checkpoint supplies and approves the three external policy inputs.

## Self-Check: PASSED

- All 21 planned or necessary supporting files exist.
- All seven Task/Build commits exist in RED→GREEN order.
- Focused and full Web tests, lint, typecheck, and production build pass.
- The app exposes no secret value and no client field can bypass readiness or hosted consent.

---
*Phase: 03-launch-content-and-customer-policy*
*Completed: 2026-07-28*
