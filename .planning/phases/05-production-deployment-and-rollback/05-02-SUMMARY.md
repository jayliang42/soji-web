---
phase: 05-production-deployment-and-rollback
plan: "02"
subsystem: infra
tags: [docker, standalone, rollback, non-root, supply-chain]
requires:
  - phase: 04-experience-and-operations-acceptance
    provides: standalone production build and liveness contract
provides:
  - strict final-image user, entry, health, port, and secret-boundary inspection
  - exact-owned prior/candidate container rollback drill
  - repeatable local and CI-compatible container commands
affects: [05-03-release-evidence, docker-fallback]
tech-stack:
  added: []
  patterns: [argv-only process execution, exact resource ownership, immutable image tags]
key-files:
  created:
    - scripts/check-phase5-container.mjs
    - scripts/check-phase5-container.test.mjs
  modified:
    - package.json
key-decisions:
  - "The Docker path proves portable app rollback mechanics only; database and provider state are absent."
  - "Cleanup may target only exact generated names that the current drill recorded as created."
patterns-established:
  - "Container gates inspect both final Config and non-truncated build history for secret assignments and environment files."
requirements-completed: [DEPLOY-01, DEPLOY-03]
duration: 5min
completed: 2026-07-28
---

# Phase 5 Plan 02: Portable Container Rollback Summary

**A non-root, secret-safe standalone image gate with a real prior → candidate → prior rollback drill**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-28T05:19:30Z
- **Completed:** 2026-07-28T05:24:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Enforced exact `nextjs`, `node apps/web/server.js`, port 3000, and loopback health contracts.
- Rejected server-secret assignments and environment files across final image env, labels, and build history.
- Added an argv-only rollback state machine with loopback ports and exact resource ownership.
- Built the image from exported clean commit `ee2aaffd4b3d3d49b142ea02612eb148fd48bb64` and passed four real health checks.

## Task Commits

1. **Task 1 RED: bounded rollback contracts** — `59bae6c` (test)
2. **Task 1 GREEN: container inspection and rollback drill** — `ee2aaff` (feat)
3. **Task 2: repeatable integration commands** — `53882d0` (chore)

## Files Created/Modified

- `scripts/check-phase5-container.mjs` — Image inspection, bounded command planning, cleanup, health polling, and CLI.
- `scripts/check-phase5-container.test.mjs` — Eight adversarial and injected-runner test groups.
- `package.json` — Fast unit and explicit Docker drill commands.

## Decisions Made

- Real mechanics use two distinct SHA-shaped tags over the same inspected exact artifact; production evidence must later use real prior/candidate artifacts.
- Docker commands run as argv arrays with fixed timeouts; response and Docker bodies never enter stable output.
- The existing untracked CI workflow and deployment document remained read-only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed secret-label and environment-file detection**

- **Found during:** Task 1 GREEN verification.
- **Issue:** Initial patterns missed JSON label keys and whitespace-delimited `.env.production` history.
- **Fix:** Added quote/colon label recognition and whitespace-aware environment-file boundaries.
- **Files modified:** `scripts/check-phase5-container.mjs`
- **Verification:** All 8 adversarial groups and real image inspection passed.
- **Committed in:** `ee2aaff`

---

**Total deviations:** 1 auto-fixed bug. **Impact:** Strengthened the planned image privacy gate without scope expansion.

## Issues Encountered

- Sandbox access to the local Docker socket required the already-authorized Docker escalation; no external service authentication was involved.

## User Setup Required

None - Docker Desktop was available and no provider configuration changed.

## Verification

- `node --test scripts/check-phase5-container.test.mjs` — 8/8 passed.
- Clean-commit Docker build — Next production build and 37 static pages passed.
- `corepack pnpm deploy:check` — standalone artifact passed.
- Image inspection — non-root, exact entry/port/health, no forbidden runtime/history material.
- `corepack pnpm phase5:container:drill` — 4/4 health transitions passed.
- Post-run `docker ps -a --filter name=soji-phase5` — zero containers remained.
- GSD key-link validation passed 1/1.

## Self-Check: PASSED

## Next Phase Readiness

- Plan 05-03 can record container inspection and local rollback proof as automated evidence.
- The Docker fallback does not claim Vercel or database rollback truth.

---
*Phase: 05-production-deployment-and-rollback*
*Completed: 2026-07-28*
