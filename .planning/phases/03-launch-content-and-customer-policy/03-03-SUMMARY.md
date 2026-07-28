---
phase: 03-launch-content-and-customer-policy
plan: "03"
subsystem: office-hours
tags: [nextjs, zod, access-control, validation, ui, accessibility]

requires:
  - phase: 01-production-identity-and-admin
    provides: Server-verified session and Admin publisher boundaries
provides:
  - Shared HTTPS/non-placeholder Office Hours destination validation
  - Stable redacted Admin errors with preserved and focused form input
  - Server-only upcoming, replay-pending, replay-ready, and unavailable projection
  - Upcoming and replay UI groups with safe external-link behavior
affects:
  - 03-05 launch readiness and evidence
  - OPS-01

tech-stack:
  added: []
  patterns:
    - Validate external targets once and return stable reason codes without the submitted value
    - Project raw target-bearing rows into bounded lifecycle/action objects before rendering
    - Return only the lifecycle-selected target after both entitlement and URL validation

key-files:
  created:
    - apps/web/src/lib/launch-inputs.ts
    - apps/web/src/lib/office-hours-presentation.ts
    - apps/web/tests/launch-inputs.test.ts
    - apps/web/tests/office-hours-presentation.test.ts
    - apps/web/tests/office-hours-page.test.tsx
  modified:
    - apps/web/src/app/api/admin/office-hours/route.ts
    - apps/web/src/components/admin-office-hours-editor.tsx
    - apps/web/src/app/office-hours/page.tsx
    - apps/web/tests/admin-office-hours-route.test.ts
    - apps/web/tests/session-failure-pages.test.tsx

key-decisions:
  - "Office Hours targets require HTTPS and reject credentials, example hosts, loopback, private IP literals, localhost, and .local names."
  - "A presentation object contains at most one lifecycle-appropriate external target and contains no raw signup or replay field."
  - "Missing replay is an honest Replay coming soon state; malformed stored targets and access failures are unavailable states."

patterns-established:
  - "External action boundary: current authenticated entitlement + lifecycle + validated target are all required before href exists."
  - "Office Hours layout: Upcoming and Replay library are separate semantic sections with localized Central Time labels."

requirements-completed: [OPS-01]

duration: 7min
completed: 2026-07-28
---

# Phase 3 Plan 3: Office Hours Destination and Lifecycle Summary

**Office Hours now rejects unsafe destinations at the write boundary and reveals only one validated, lifecycle-appropriate target after server-side membership verification**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-28T02:44:00Z
- **Completed:** 2026-07-28T02:51:25Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added a shared destination validator covering HTTPS, credentials, example domains and subdomains, loopback/private IP literals, local hosts, malformed input, and length limits.
- Reused the validator in the Admin route and editor so failures return stable redacted reasons, preserve the draft, and focus the first invalid destination.
- Added a pure server presentation projection that distinguishes upcoming, replay pending, replay ready, and unavailable while omitting both targets until exact access and lifecycle conditions pass.
- Rebuilt Office Hours into semantic Upcoming and Replay library sections with truthful membership labels, Central Time, safe new-tab behavior, and accessible announcements.

## Task Commits

1. **Task 1 RED: Define Office Hours URL contracts** - `f6c258b` (test)
2. **Task 1 GREEN: Validate Office Hours destinations** - `ed4fc05` (feat)
3. **Task 2 RED: Define lifecycle and access projection contracts** - `cba5d14` (test)
4. **Task 2 GREEN: Project lifecycle and access before rendering** - `e6394b2` (feat)

## Files Created/Modified

- `apps/web/src/lib/launch-inputs.ts` - Stable, value-redacting production destination validator.
- `apps/web/src/app/api/admin/office-hours/route.ts` - Shared create/update validation and normalized targets.
- `apps/web/src/components/admin-office-hours-editor.tsx` - Field-specific corrections and focus retention.
- `apps/web/src/lib/office-hours-presentation.ts` - Bounded lifecycle/access presentation objects.
- `apps/web/src/app/office-hours/page.tsx` - Upcoming/replay editorial sections and safe actions.
- `apps/web/tests/launch-inputs.test.ts` - Full safe/unsafe destination matrix.
- `apps/web/tests/admin-office-hours-route.test.ts` - Redacted stable route errors and empty replay handling.
- `apps/web/tests/office-hours-presentation.test.ts` - Target-selection and non-disclosure contracts.
- `apps/web/tests/office-hours-page.test.tsx` - Entitled, locked, action, and accessible-link markup.
- `apps/web/tests/session-failure-pages.test.tsx` - Degraded-session target leakage regression.

## Decisions Made

- Valid external targets are normalized by the server after validation, but no invalid response echoes the submitted value.
- The projection never carries both signup and replay URLs. Upcoming can carry signup; completed replay-ready can carry replay; every other state carries neither.
- Office Hours dates use an explicit `America/Chicago` presentation zone so the page names a timezone consistently instead of inheriting the deployment server zone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed empty optional replay validation throwing inside Zod refinement**

- **Found during:** Task 1 RED route tests
- **Issue:** The previous optional/empty union still executed `new URL("")` inside a refinement and threw instead of returning a stable 400 or accepting an absent replay.
- **Fix:** Replaced the local URL schema with the shared validator and an explicit empty-replay branch.
- **Files modified:** `apps/web/src/app/api/admin/office-hours/route.ts`
- **Verification:** Empty replay persists as `null`; all route and validator tests pass.
- **Committed in:** `ed4fc05`

---

**Total deviations:** 1 auto-fixed (1 route validation bug)
**Impact on plan:** The fix restored the documented optional replay behavior while making all new destinations stricter.

## Issues Encountered

- The plan referenced `packages/domain/src/entitlements.ts`, which does not exist. The authoritative `hasEntitlement` implementation is in `packages/domain/src/plans.ts` and was read without changing the established contract.

## Verification

- URL/projection RED observations failed on the missing validator/projection and old UI behavior.
- Focused validator, Admin route, projection, page, and degraded-session suite passed: 79 test files and 577 tests.
- Web typecheck passed.
- Guest, wrong-entitlement, invalid-target, replay-pending, and access-failure projections contain no private target sentinel.
- Entitled upcoming and replay states contain exactly the selected target and safe `_blank`/`noreferrer noopener` markup.
- No real owner/provider URL was created or marked ready.

## User Setup Required

None for this plan. Exact signup and replay destinations remain part of the single consolidated owner checkpoint.

## Next Phase Readiness

- Plan 03-05 can reuse the same validator and presentation states for readiness and non-fabricable evidence.
- The owner can later supply exact targets through the existing Admin screen without another application change.

## Self-Check: PASSED

- All ten planned artifacts exist.
- Commits `f6c258b`, `ed4fc05`, `cba5d14`, and `e6394b2` exist in RED→GREEN order.
- Focused tests and Web typecheck pass.
- Unauthorized/error static HTML excludes both target sentinels.

---
*Phase: 03-launch-content-and-customer-policy*
*Completed: 2026-07-28*
