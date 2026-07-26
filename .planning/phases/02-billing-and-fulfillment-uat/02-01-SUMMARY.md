---
phase: 02-billing-and-fulfillment-uat
plan: "01"
subsystem: database
tags: [postgres, supabase, pgtap, stripe, billing, rls]

requires:
  - phase: 01-production-foundation
    provides: Subscription state, entitlement, billing-event, refund, and dispute foundations
provides:
  - Normalized subscription refund and dispute adjustment authority
  - Shared atomic subscription access recomputation
  - Service-role adjustment, paid-payment reconciliation, and schema-readiness RPCs
  - Focused pgTAP state-machine and security contract
  - Generated TypeScript database contracts
affects:
  - 02-02 Stripe processor integration
  - 02-06 production schema readiness
  - BILL-03
  - BILL-05

tech-stack:
  added: []
  patterns:
    - Advisory-locked provider event ordering with normalized adjustment history
    - Shared database access recomputation for subscription and adjustment paths
    - Service-role readiness RPC exposing booleans without catalog data

key-files:
  created:
    - supabase/migrations/20260726000000_subscription_billing_adjustments.sql
    - supabase/tests/subscription_billing_adjustments.sql
    - apps/web/src/lib/supabase/database.types.ts
  modified:
    - supabase/schema.sql

key-decisions:
  - "Lost disputes and full refunds remain monotonic access blocks; only a later verified payment may supersede a full refund."
  - "Subscription and adjustment sync share one internal recomputation helper so subscription refreshes cannot erase unresolved billing blocks."
  - "Readiness is exposed as service-role-only named booleans, keeping production catalog rows and secrets private."

patterns-established:
  - "Adjustment identity: provider, kind, and provider adjustment ID form the replay-safe unique key."
  - "Bounded receipts: billing events retain only allowlisted provider reference strings, never provider payloads or customer records."

requirements-completed: [BILL-03, BILL-05]

duration: 33min
completed: 2026-07-26
---

# Phase 2 Plan 1: Subscription Billing Adjustment Authority Summary

**Atomic Postgres authority for ordered Stripe subscription refunds and disputes, with shared access recomputation, service-only readiness checks, 58 focused pgTAP assertions, and generated TypeScript contracts**

## Performance

- **Duration:** 33 min
- **Started:** 2026-07-26T17:06:50Z
- **Completed:** 2026-07-26T17:39:15Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added normalized, replay-safe subscription adjustment history for refunds and disputes with advisory locking, monotonic terminal states, and verified-payment supersession.
- Centralized membership tier and entitlement recomputation so active subscription refreshes cannot override unresolved access blocks.
- Enforced service-role mutation/readiness boundaries, owner/Admin read RLS, authenticated no-write behavior, and bounded receipt reference keys.
- Added a 58-test focused pgTAP contract and synchronized generated Supabase TypeScript types.
- Passed the complete local database wave gate: 327 tests across both database suites.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write a focused RED pgTAP contract** - `71ad2b6` (test)
2. **Task 2: Implement adjustment, shared access, receipt allowlist, and readiness RPC** - `31ddb7d` (feat)
3. **Task 3: Generate exact Supabase TypeScript contracts** - `b895f38` (chore)

## Files Created/Modified

- `supabase/tests/subscription_billing_adjustments.sql` - Focused RED/GREEN state-machine, ordering, rollback, RLS, grants, receipt, and readiness contract.
- `supabase/migrations/20260726000000_subscription_billing_adjustments.sql` - Forward-only adjustment table, access helper, service RPCs, grants, policies, and receipt allowlist.
- `supabase/schema.sql` - Exact declarative mirror of the new migration.
- `apps/web/src/lib/supabase/database.types.ts` - Generator-owned table relationships and RPC argument/return contracts.

## Decisions Made

- Lost disputes and full refunds remain blocking terminal states. A full refund is restored only through explicit reconciliation of a later verified payment.
- Both subscription state sync and adjustment sync call the same internal access recomputation helper under subscription/user advisory locks.
- The readiness RPC returns only named booleans and requires the service role; anon and authenticated callers receive no catalog visibility.
- Receipt payloads accept only bounded Stripe reference strings (`chargeId`, `customerId`, `disputeId`, `paymentId`, `subscriptionId`) alongside the existing minimal event envelope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a PL/pgSQL variable/column name collision**

- **Found during:** Task 2 GREEN verification
- **Issue:** `reconcile_stripe_subscription_paid_payment` used `subscription_id` as a local variable and as an adjustment column reference, causing PostgreSQL to reject the reconciliation update as ambiguous.
- **Fix:** Renamed the local value to `target_subscription_id` in the forward migration and exact schema mirror.
- **Files modified:** `supabase/migrations/20260726000000_subscription_billing_adjustments.sql`, `supabase/schema.sql`
- **Verification:** Clean local database reset, focused pgTAP 58/58, schema reapply, and full database suite 327/327 all passed.
- **Committed in:** `31ddb7d`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The correction was required for reconciliation correctness and introduced no scope change.

## Issues Encountered

- Local Supabase startup initially stalled on Docker Desktop and macOS keychain credential helpers. Explicit local-only Docker configuration and a placeholder local CLI token bypassed those helpers; all work remained against the local development stack, and production was untouched.
- The shared checkout contained a large pre-existing uncommitted `supabase/schema.sql` rewrite. Task 2 staged only the exact 833-line migration mirror through the Git index, preserving all unrelated working-tree edits.

## Verification

- Focused subscription adjustment pgTAP: 58/58 passed.
- Declarative schema reapply: passed.
- Generated database type parity: passed.
- `@soji/web` TypeScript check: passed.
- Full local database wave gate: 327/327 passed.
- HIGH threats T-02-02, T-02-03, and T-02-09: mitigated by the committed ordering, authorization, RLS, forward-migration, parity, and test controls.
- Production Supabase and Stripe state: unchanged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-02 can consume the generated adjustment and reconciliation RPC contracts in the Stripe event processor.
- Plan 02-06 can call the service-only readiness RPC before applying or verifying production schema.
- No blockers remain for the next Phase 2 plan.

## Self-Check: PASSED

- All four plan artifacts exist.
- Task commits `71ad2b6`, `31ddb7d`, and `b895f38` exist in git history.
- Verification claims match the recorded command results.

---
*Phase: 02-billing-and-fulfillment-uat*
*Completed: 2026-07-26*
