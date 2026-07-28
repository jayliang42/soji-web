---
phase: 05-production-deployment-and-rollback
plan: "01"
subsystem: infra
tags: [vercel, release, rollback, smoke, security]
requires:
  - phase: 02-billing-and-fulfillment-uat
    provides: exact detached release-input and deployment inspection validation
  - phase: 04-experience-and-operations-acceptance
    provides: launch readiness and public experience contracts
provides:
  - exact staged/current/rollback/re-promotion lifecycle validation
  - bounded credential-free production smoke probing
  - privacy-minimized release evidence projection
affects: [05-03-release-evidence, 05-04-live-deployment]
tech-stack:
  added: []
  patterns: [import-safe CLI, fixed lifecycle state machine, body-free smoke evidence]
key-files:
  created:
    - scripts/check-phase5-release.mjs
    - scripts/check-phase5-release.test.mjs
  modified: []
key-decisions:
  - "A staged candidate cannot carry the canonical alias; promotion, rollback, and re-promotion must retain exact deployment identities."
  - "Smoke probes return only stable route/status/readiness outcomes and discard origins, bodies, headers, errors, cookies, and provider identifiers."
patterns-established:
  - "Release lifecycle proof reuses Phase 2 exact-input and provider inspection authority rather than weakening or copying it."
  - "Generated production origins enter only through permission-restricted files."
requirements-completed: [DEPLOY-01, DEPLOY-02]
duration: 6min
completed: 2026-07-28
---

# Phase 5 Plan 01: Deterministic Release Gate Summary

**Exact Vercel candidate lifecycle validation and a fixed, credential-free public production smoke gate**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-28T05:13:00Z
- **Completed:** 2026-07-28T05:19:19Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Reused the Phase 2 clean-detached release and deployment inspection authority.
- Enforced the only valid prior → staged → current → rolled back → re-promoted identity sequence.
- Probed 12 fixed health/readiness/public routes with no redirects, credentials, cached requests, or retained response detail.
- Added adversarial coverage for identity, origin, state, response, privacy, file-permission, and import-safety failures.

## Task Commits

1. **Tasks 1–2 RED: lifecycle and smoke contracts** — `3e114ca` (test)
2. **Tasks 1–2 GREEN: deterministic release lifecycle gates** — `fa9e41a` (feat)

## Files Created/Modified

- `scripts/check-phase5-release.mjs` — Import-safe release lifecycle and smoke validator.
- `scripts/check-phase5-release.test.mjs` — Nine adversarial Node test groups.

## Decisions Made

- Lifecycle evidence retains only the public commit, final-eight deployment suffix, and fixed state.
- The readiness projection accepts exactly the named Soji readiness checks, all true.
- All live CLI input files must be mode `0600`; default import performs no I/O or mutation.

## Deviations from Plan

None - the two tasks share one module and test file, so their RED and GREEN outcomes were committed together.

## Issues Encountered

- Initial GREEN exposed an incomplete readiness fixture and two incorrectly targeted negative assertions; both were corrected before the implementation commit.

## User Setup Required

None - this plan performs no external service configuration.

## Verification

- `node --test scripts/check-phase5-release.test.mjs` — 9/9 passed.
- `corepack pnpm --filter @soji/web test -- tests/health-routes.test.ts` — 81 files and 628 tests passed.
- Import-safety check emitted no stdout or stderr.
- GSD key-link validation passed 1/1.

## Self-Check: PASSED

## Next Phase Readiness

- Plan 05-03 can consume normalized lifecycle/smoke results.
- Live Vercel mutation remains isolated to the single Plan 05-04 owner checkpoint.

---
*Phase: 05-production-deployment-and-rollback*
*Completed: 2026-07-28*
