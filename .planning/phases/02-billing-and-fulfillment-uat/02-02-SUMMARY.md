---
phase: 02-billing-and-fulfillment-uat
plan: "02"
subsystem: payments
tags: [stripe, invoice-payments, webhooks, checkout, reconciliation, vitest]

requires:
  - phase: 02-01
    provides: Atomic subscription adjustment and paid-payment reconciliation RPCs
provides:
  - Server-owned subscription Checkout authority and continuity contract
  - Exact PaymentIntent-to-InvoicePayment subscription adjustment classification
  - Mutually exclusive product and membership refund/dispute dispatch
  - Paid Invoice Payment reconciliation without active-status inference
  - Bounded Stripe receipt references and focused recovery regression coverage
affects:
  - 02-03 Account billing truth
  - 02-04 Admin billing incident ledger
  - 02-07 through 02-09 provider-backed Stripe UAT
  - BILL-01
  - BILL-02
  - BILL-03
  - BILL-04
  - BILL-05

tech-stack:
  added: []
  patterns:
    - Product metadata fast path followed by exact Invoice Payment classification
    - Current Subscription metadata validation before membership adjustment writes
    - Provider paid timestamp delegated to the atomic database reconciliation RPC

key-files:
  created:
    - apps/web/src/lib/stripe-webhook.ts
    - apps/web/src/lib/stripe-reconciliation.ts
    - apps/web/tests/checkout-routes.test.ts
    - apps/web/tests/stripe-webhook-sync.test.ts
    - apps/web/tests/stripe-reconciliation.test.ts
  modified: []

key-decisions:
  - "Zero Invoice Payment mappings remain stable ignored outcomes, while ambiguous or malformed mappings fail before any adjustment RPC."
  - "Valid product metadata is the exclusive fast path; membership adjustments require one Invoice Payment, one subscription Invoice parent, and valid current Subscription metadata."
  - "Reconciliation may refresh active subscription state, but only an exact paid PaymentIntent and its provider paid timestamp can invoke paid-payment supersession."

patterns-established:
  - "Adjustment classification: PaymentIntent metadata proves product ownership; Invoice Payment and current Subscription evidence prove membership ownership."
  - "Paid reconciliation: latest Invoice plus one paid PaymentIntent mapping supplies the timestamp; the database decides later/same/older ordering."
  - "Receipt minimization: only bounded direct charge, dispute, payment, subscription, and customer references are retained."

requirements-completed: [BILL-01, BILL-02, BILL-03, BILL-04, BILL-05]

duration: 15min
completed: 2026-07-26
---

# Phase 2 Plan 2: Stripe Billing Dispatch and Recovery Summary

**Server-owned Checkout contracts, exact Stripe Invoice Payment classification, mutually exclusive adjustment dispatch, and paid-evidence reconciliation backed by 100 focused passing tests**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-26T17:44:28Z
- **Completed:** 2026-07-26T18:00:09Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Proved that subscription Checkout rejects every client authority field, reuses the newest bound Customer, preserves same-intent claim/idempotency values, and blocks concurrent membership Sessions.
- Classified refunds and all five dispute event types through exact PaymentIntent-to-InvoicePayment evidence while preserving the product metadata fast path.
- Routed product and membership reversals to mutually exclusive atomic RPCs, with zero mappings ignored and ambiguous, deleted, parentless, or invalid evidence rejected before writes.
- Added bounded receipt references without persisting provider payloads, metadata, emails, or secrets.
- Reconciled only one paid PaymentIntent-backed latest-Invoice result and passed its Stripe paid timestamp to the database authority; active status alone never invokes paid supersession.
- Preserved original-event Retry, synthetic identifier Retry, token-owned leases, customer pagination, and stale-subscription closure.

## Task Commits

Each task was committed atomically:

1. **Task 1: Prove Checkout rejects client authority and preserves continuity** - `93c4484` (test)
2. **Task 2 RED: Define exact Invoice Payment dispatch contract** - `3f58a13` (test)
3. **Task 2 GREEN: Classify and dispatch Stripe billing adjustments** - `27a476c` (feat)
4. **Task 3 RED: Define authoritative paid reconciliation contract** - `c045799` (test)
5. **Task 3 GREEN: Reconcile exact paid subscription evidence** - `01f9384` (feat)

## Files Created/Modified

- `apps/web/tests/checkout-routes.test.ts` - Negative authority, Customer continuity, claim exclusivity, and Session idempotency coverage.
- `apps/web/src/lib/stripe-webhook.ts` - Bounded receipts, exact payment classification, and product/membership adjustment dispatch.
- `apps/web/tests/stripe-webhook-sync.test.ts` - Product/subscription, zero, ambiguous, deleted, null-parent, invalid-metadata, and Charge-fallback contract.
- `apps/web/src/lib/stripe-reconciliation.ts` - Latest-Invoice paid PaymentIntent mapping and authoritative database reconciliation.
- `apps/web/tests/stripe-reconciliation.test.ts` - Later, same-time, older, missing, ambiguous, Charge-only, and timestamp-free paid evidence coverage.

## Decisions Made

- A PaymentIntent with valid Soji product ownership metadata never enters membership classification. All other payments require exact Invoice Payment evidence; email, amount, Customer, and local-recency inference are absent.
- Zero Invoice Payment mappings are intentionally ignored because they establish no Soji ownership. Multiple mappings or malformed mapped evidence fail so no receipt can attach an adjustment to a guessed subscription.
- Subscription reconciliation first refreshes current provider state, then separately supplies exact paid evidence to `reconcile_stripe_subscription_paid_payment`. The database remains the sole authority for whether the paid timestamp is later than a blocking refund.
- Checkout source was left unchanged because its existing strict payload, Customer lookup, claim, and idempotency behavior satisfied every new value-level assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Narrowed nullable PaymentIntent and test mock call types**

- **Found during:** Task 2 GREEN type-check verification
- **Issue:** TypeScript correctly retained `null` through the Stripe object union, and an untyped Vitest mock exposed an empty call tuple.
- **Fix:** Added an explicit truthy object guard before PaymentIntent classification and a narrow `unknown[][]` test-only call inspection.
- **Files modified:** `apps/web/src/lib/stripe-webhook.ts`, `apps/web/tests/stripe-webhook-sync.test.ts`
- **Verification:** Focused webhook tests passed 40/40 and `@soji/web` type-check passed.
- **Committed in:** `27a476c`

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking issue)
**Impact on plan:** The fix was limited to type-safe narrowing of planned code and introduced no scope change.

## Issues Encountered

- Task 1's first RED run failed because the new test used an incorrect Unix timestamp constant, not because the application contract was missing. Correcting the fixture produced 23/23 passing tests; inspection confirmed the existing dirty route already satisfied the planned authority contract.
- The shared checkout began with untracked plan-target files and a modified subscription route. Commits included only the exact Plan 02 test and library files; the pre-existing route modification and all unrelated dirty changes remain untouched.

## Verification

- Checkout authority and continuity: 23/23 passed in 1.07 seconds.
- Invoice Payment classification and adjustment dispatch: 40/40 passed in 0.91 seconds.
- Reconciliation, Retry, leases, and receipt-first routing: 37/37 passed in 1.02 seconds.
- `@soji/web` strict TypeScript check: passed.
- HIGH threats T-02-01, T-02-04, and T-02-07: mitigated by exact ownership evidence, mutually exclusive atomic dispatch, fail-before-RPC behavior, receipt minimization, and focused tests.
- No provider credentials, production mutations, real Stripe calls, or live UAT PASS evidence were used.
- Full Web and database suites were intentionally deferred to the sequential wave gate, as required by `02-VALIDATION.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-03 can render customer-safe subscription adjustment truth from the database authority established in Plan 02-01 and the processor paths completed here.
- Plan 02-04 can expose bounded receipt references and distinct recovery outcomes in the Admin incident ledger.
- Provider-backed Checkout, Portal, refund, dispute, Retry, and reconciliation rows remain pending for Plans 02-07 through 02-09; repository tests did not promote live UAT evidence.

## Self-Check: PASSED

- All five created plan artifacts exist.
- Task commits `93c4484`, `3f58a13`, `27a476c`, `c045799`, and `01f9384` exist in git history.
- All task acceptance criteria and plan-level focused verification commands pass.
- No known stubs or unplanned threat surfaces remain in the created files.

---
*Phase: 02-billing-and-fulfillment-uat*
*Completed: 2026-07-26*
