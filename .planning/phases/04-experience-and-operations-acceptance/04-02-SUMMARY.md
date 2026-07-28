---
phase: 04-experience-and-operations-acceptance
plan: "02"
subsystem: observability
tags: [operations-alerts, redaction, fetch, readiness]
requires:
  - phase: 03-launch-content-and-customer-policy
    provides: production readiness and Admin launch checklist
provides:
  - versioned allowlisted operations-alert envelope
  - redirect-refusing bounded secondary delivery
  - missing/invalid/ready alert receiver state
affects: [phase-04-evidence, production-operations]
tech-stack:
  added: []
  patterns: [local-log-first, allowlisted external envelope, secondary-failure isolation]
key-files:
  created: []
  modified:
    - apps/web/src/lib/observability.ts
    - apps/web/src/lib/env.ts
    - apps/web/src/lib/admin-launch-checklist.ts
    - apps/web/src/app/admin/page.tsx
key-decisions:
  - "External alert bodies never reuse the richer local OperationalLog shape."
  - "Receiver URLs permit provider paths but reject query credentials, userinfo, fragments, redirects, and non-HTTPS production targets."
patterns-established:
  - "Operational delivery records local truth before bounded secondary fetch."
  - "Readiness distinguishes missing owner input from invalid configuration without printing destinations."
requirements-completed: [OPS-02]
duration: 3 min
completed: 2026-07-28
---

# Phase 04 Plan 02: Operations Alert Safety Summary

**Versioned seven-field operations alerts with allowlist redaction, HTTPS/redirect safety, non-recursive failure logging, and truthful Admin readiness**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-28T04:45:20Z
- **Completed:** 2026-07-28T04:48:21Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added a `schemaVersion: 1` alert envelope containing only event code, severity,
  subsystem, UTC occurrence time, environment, and retryability.
- Proved arbitrary errors, context, emails, tokens, cookies, URLs, provider payloads,
  response bodies, and full IDs never reach the receiver.
- Added redirect refusal, a two-second abort signal, local-first ordering, exactly one
  stable secondary-delivery warning, and missing/invalid/ready Admin states.

## Task Commits

1. **Task 1 RED: Alert envelope contract** — `151117e`
2. **Task 1 GREEN: Versioned redacted delivery** — `c07a9bd`
3. **Task 2 RED: Receiver readiness states** — `1336421`
4. **Task 2 GREEN: Truthful receiver readiness** — `74d8dad`

## Files Created/Modified

- `apps/web/src/lib/observability.ts` — allowlisted envelope and bounded delivery.
- `apps/web/src/lib/env.ts` — credential-free receiver validation and state projection.
- `apps/web/src/lib/admin-launch-checklist.ts` — explicit missing/invalid/ready copy.
- `apps/web/src/app/admin/page.tsx` — shared production receiver state integration.
- Corresponding Vitest files — payload, redaction, delivery failure, URL, and readiness proof.

## Decisions Made

- Optional references remain omitted because no current caller needs an external
  correlation value; local records retain diagnostic identifiers.
- Query credentials are rejected. Receiver secrets must not appear in URLs or evidence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Integration] Wire receiver state into Admin page**
- **Found during:** Task 2
- **Issue:** Changing the checklist contract required its sole production caller to pass
  the new state rather than a boolean.
- **Fix:** `admin/page.tsx` now uses the same environment state evaluator.
- **Files modified:** `apps/web/src/app/admin/page.tsx`
- **Verification:** Full Web unit suite and typecheck passed.
- **Committed in:** `74d8dad`

**Total deviations:** 1 auto-fixed integration dependency.
**Impact on plan:** Required to keep the shared runtime/readiness contract functional.

## Issues Encountered

None.

## User Setup Required

None during local execution. Production receiver configuration remains in the final
consolidated owner checkpoint.

## Verification

- Web Vitest: 81 files, 618 tests passed.
- Web route-type generation and TypeScript check passed.
- Exact payload-key, privacy-sentinel, local-first, redirect, timeout/failure, and
  non-recursion assertions passed.

## Next Phase Readiness

Ready for 04-03 scheduled cleanup hardening.

## Self-Check: PASSED

---
*Phase: 04-experience-and-operations-acceptance*
*Completed: 2026-07-28*
