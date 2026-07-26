---
phase: 02-billing-and-fulfillment-uat
plan: "04"
subsystem: ui
tags: [nextjs, react, tailwind, supabase, stripe, billing, accessibility]

requires:
  - phase: 02-01
    provides: Minimized billing receipt reference allowlist and durable processing leases
  - phase: 02-02
    provides: Original-event Retry, synthetic reconciliation, and bounded Stripe references
provides:
  - Auth-first Admin search across fixed event and minimized receipt reference paths
  - Defensive secret-free billing-event mapping with exact count and deterministic ordering
  - Accessible incident ledger separating receipt, processing, lease, attempt, and object evidence
  - Eligibility-gated original-event Retry and sub_/cus_ reconciliation with focus restoration
affects:
  - 02-08 provider-backed receipt and recovery UAT
  - Phase 4 Admin responsive and accessibility acceptance
  - BILL-02
  - BILL-05

tech-stack:
  added: []
  patterns:
    - Fixed allowlisted PostgREST JSON-path search after Admin authorization
    - One shared live region with explicit message and event-heading focus targets
    - Stable processing-error normalization before Admin API and UI output

key-files:
  created:
    - apps/web/src/lib/billing.ts
    - apps/web/src/app/api/admin/billing-events/route.ts
    - apps/web/src/components/admin-billing-events.tsx
    - apps/web/tests/admin-billing-events-route.test.ts
    - apps/web/tests/admin-billing-events-component.test.tsx
  modified:
    - packages/types/src/index.ts

key-decisions:
  - "Admin billing search uses only provider event/type plus fixed object, dispute, payment, subscription, and customer JSON paths; email-shaped and PostgREST grammar input never reaches the query."
  - "Receipt remains Received for every stored row while Processing independently maps Awaiting, In progress, Lease expired, Complete, No handler, or Failed."
  - "Unsafe stored processing detail is replaced with a stable code before API output, and the UI never renders raw provider or database messages."
  - "Retry disables only its own record; search, reconciliation, and pagination retain independent pending and focus behavior."

patterns-established:
  - "Incident evidence order: Received, Processing, Attempts, Object, then stable error and supported recovery."
  - "Synthetic recovery: only validated sub_/cus_ identifiers create object references and type-aware reconciliation Retry guidance."

requirements-completed: [BILL-02, BILL-05]

duration: 27min
completed: 2026-07-26
---

# Phase 2 Plan 4: Bounded Admin Billing Incident Ledger Summary

**Auth-first bounded receipt search and an accessible incident ledger now expose independent receipt, processing, lease, attempt, reference, and recovery truth without raw provider or database detail**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-26T19:14:11Z
- **Completed:** 2026-07-26T19:41:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extended the shared billing-event contract and mapper with defensive object, dispute, payment, subscription, and customer references parsed only from minimized JSON.
- Added Admin-authorized, exact-count search across fixed allowlisted paths with capped input, email rejection, filter-grammar removal, and deterministic `created_at DESC, id DESC` ordering.
- Rebuilt Billing Events as a responsive incident ledger with separate `Receipt · Received` and `Processing · …` badges for every processing and lease outcome.
- Added semantic localized times, four ordered evidence columns, selectable wrapping identifiers, stable errors, exact Retry eligibility, and type-aware original/synthetic recovery copy.
- Added one shared polite live region, exact focus targets, independent pending controls, role/error/empty/no-match states, 44px controls, and fixed pagination geometry.
- Passed the full Web regression gate with 531 tests plus strict TypeScript and ESLint.

## Task Commits

Each task followed RED then GREEN:

1. **Task 1 RED: Define bounded billing-event query contract** - `64a3a5e` (test)
2. **Task 1 GREEN: Expose bounded billing-event evidence** - `2b1f76e` (feat)
3. **Task 2 RED: Define billing incident-ledger contract** - `fe06c8c` (test)
4. **Task 2 GREEN: Render bounded billing incident ledger** - `c145921` (feat)

## Files Created/Modified

- `packages/types/src/index.ts` - Shared bounded billing-event references and receipt/processing snapshot contract.
- `apps/web/src/lib/billing.ts` - Minimized-JSON reference mapper and stable processing-error boundary.
- `apps/web/src/app/api/admin/billing-events/route.ts` - Auth-first capped status/reference search with exact count and stable failures.
- `apps/web/src/components/admin-billing-events.tsx` - Responsive accessible receipt/processing incident ledger and recovery interactions.
- `apps/web/tests/admin-billing-events-route.test.ts` - Authorization, reference, injection, privacy, error, count, filter, and ordering coverage.
- `apps/web/tests/admin-billing-events-component.test.tsx` - Outcome, lease, Retry, reconciliation, focus, live-region, privacy, wrapping, and exact-copy coverage.

## Decisions Made

- The search route constructs its PostgREST OR expression from fixed column/JSON paths only. User input contributes only a capped sanitized value, and email-shaped input is rejected before query construction.
- The stored receipt is always presented as received and stored. Processing is a separate state machine with explicit awaiting, active lease, expired lease, complete, ignored, and failed outcomes.
- API output preserves safe machine-readable processing codes but replaces any value containing free text or unexpected characters with `billing_event_processing_failed`.
- Successful Retry focuses the existing event heading; successful reconciliation focuses the prepended synthetic event; no-match and failure outcomes focus the one shared message region.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Normalized unsafe stored processing errors before Admin output**

- **Found during:** Task 2 privacy verification
- **Issue:** A historical `processing_error` may contain free-form provider or database detail even though the new component hid it; the Admin query response would still expose that value to the browser.
- **Fix:** Added allowlisted stable-code validation in the billing mapper and replaced unsafe values with `billing_event_processing_failed`; added route assertions for email/database-detail omission.
- **Files modified:** `apps/web/src/lib/billing.ts`, `apps/web/tests/admin-billing-events-route.test.ts`
- **Verification:** Task 1 focused tests passed 17/17, Task 2 focused tests passed 28/28, and strict typecheck/lint passed.
- **Committed in:** `c145921`

---

**Total deviations:** 1 auto-fixed (1 Rule 2 missing critical privacy boundary)
**Impact on plan:** The fix completed the planned HIGH information-disclosure mitigation without adding a new endpoint, dependency, provider operation, or architectural surface.

## Issues Encountered

- React static rendering serializes `tabIndex` as lowercase `tabindex`; the focus-target assertion was corrected while preserving the semantic focusable heading.
- The first combined staging/commit attempt appeared non-responsive and was interrupted safely before anything was staged or committed. After confirming `HEAD`, index, and file state, the exact four Task 2 files were staged and the normal hooked commit completed successfully. Hooks were never bypassed.
- The shared type file retained unrelated baseline changes. Partial staging committed only `BillingEventStatus`, `BillingEventLog`, and `BillingEventSnapshot`; unrelated Managed User, content, product, and office-hour hunks remain untouched.

## Verification

- Task 1 route/mapper gate: 17/17 passed in 1.14 seconds.
- Task 2 ledger/retry/reconcile gate: 28/28 passed in 1.55 seconds.
- Full Web regression: 76 files, 531/531 tests passed in 3.19 seconds.
- Strict route-aware Web TypeScript check: passed.
- Web ESLint: passed.
- Receipt and processing remain separate for all six processing/lease outcomes; Retry exists only for received, failed, and expired-processing rows.
- Search is Admin-auth-first, capped at 200 characters, exact-counted, deterministically ordered, and limited to fixed event/reference paths.
- HIGH threats T-02-06 and T-02-07 are mitigated by explicit evidence labels, lease/recovery gating, stable error normalization, fixed search paths, email/injection rejection, and focused passing tests.
- No provider credentials, production mutations, login actions, raw payloads, customer emails, secrets, or live Stripe calls were used.

## Known Stubs

None. Input placeholders are the approved examples from `02-UI-SPEC.md`; they are not mock data or unwired UI.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-05 can define the fixed secret-safe evidence artifact and validator.
- Plan 02-08 can exercise signed receipt, ignored outcome, recoverable failure, Retry, and reconciliation against this exact Admin presentation.
- Provider-backed PASS evidence remains pending; repository tests did not promote any live UAT scenario.

## Self-Check: PASSED

- All six implementation/test artifacts exist.
- Task commits `64a3a5e`, `2b1f76e`, `fe06c8c`, and `c145921` exist in git history.
- Both focused commands, the full Web suite, strict typecheck, and lint pass.
- No known goal-blocking stubs or unplanned threat surfaces remain.

---
*Phase: 02-billing-and-fulfillment-uat*
*Completed: 2026-07-26*
