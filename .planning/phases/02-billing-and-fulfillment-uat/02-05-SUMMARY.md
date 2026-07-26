---
phase: 02-billing-and-fulfillment-uat
plan: "05"
subsystem: testing
tags: [node, uat, stripe, supabase, vercel, security, operations]

requires:
  - phase: 02-01
    provides: Production billing schema-readiness RPC and minimized receipt boundary
  - phase: 02-04
    provides: Bounded Admin billing incident ledger and recovery presentation
  - phase: 01-02
    provides: Fixed-row production evidence validation pattern
provides:
  - Strict fixed-set validation for 25 Phase 2 schema and provider scenarios
  - Machine-readable schema, migration, deployment, readiness, and release-input gates
  - Secret-safe 25-row PENDING evidence ledger with no fabricated provider observations
  - Exact operator runbook for canonical Stripe test-mode UAT and recovery
affects:
  - 02-06 production schema and deployment verification
  - 02-07 checkout and portal UAT
  - 02-08 receipt, delivery, refund, and dispute UAT
  - 02-09 evidence closeout
  - BILL-01
  - BILL-02
  - BILL-03
  - BILL-04
  - BILL-05

tech-stack:
  added: []
  patterns:
    - Import-safe Node validator with strict mode-specific option allowlists
    - Fixed-set Markdown evidence parsing with fail-closed privacy and fabrication checks
    - Remote probes that return public identity and named booleans only
    - Detached exact-commit release validation before production build or deployment

key-files:
  created:
    - scripts/check-phase2-uat-evidence.mjs
    - scripts/check-phase2-uat-evidence.test.mjs
    - .planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md
    - docs/phase-2-billing-and-fulfillment-uat.md
  modified:
    - package.json

key-decisions:
  - "Provider PASS requires a live Stripe test-mode observation on the exact canonical origin; mocks, fixtures, repository tests, configuration, contracts, and dry runs cannot promote evidence."
  - "Every preflight mode uses exact named inputs and fails closed on malformed, missing, duplicate, extra, dirty, untracked, or identity-mismatched state."
  - "Production probes accept secrets only from the secure environment and expose only public commit/deployment identity or named readiness booleans."
  - "The initial evidence artifact remains exactly 25 PENDING rows; later plans must promote rows one at a time from observed canonical outcomes."

patterns-established:
  - "Evidence identity: fixed scenario ID, UTC date, canonical environment, redacted subject, object type, last-eight suffix, expected, observed, and notes."
  - "Release order: validate detached inputs, rerun the gate, build, run deploy:check, then and only then allow authorized production configuration or deployment."

requirements-completed: [BILL-01, BILL-02, BILL-03, BILL-04, BILL-05]

duration: 28min
completed: 2026-07-26
---

# Phase 2 Plan 5: Secret-Safe Billing UAT Evidence System Summary

**A strict 25-scenario evidence gate now separates canonical Stripe test-mode observations from mocks while machine-checking schema, deployment, readiness, and exact release identity without exposing secrets**

## Performance

- **Duration:** 28 min
- **Started:** 2026-07-26T19:46:00Z
- **Completed:** 2026-07-26T20:13:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added an import-safe Phase 2 evidence validator with the exact 25 fixed IDs, strict row
  structure, fixed-set and per-ID assertions, all-PASS readiness, and explicit rejection of
  fabricated provider observations.
- Added fail-closed parsers and CLI gates for migration preflight/postflight, production schema
  readiness, Vercel deployment identity, canonical health and `/api/me` readiness, and clean
  detached release inputs.
- Added privacy checks for addresses, full provider IDs, card data, keys, signatures, cookies,
  tokens, credential-bearing URIs, and raw payload material.
- Created the authoritative 25-row ledger with every row deliberately `PENDING`; no repository
  test, local parser, configuration check, or unexecuted provider scenario was promoted.
- Authored a scenario-by-scenario operator runbook covering Account, Admin, access, recovery,
  and redaction expectations plus the exact Plan 02-06 production sequence.
- Preserved the Phase 1 UAT suite while exposing root `phase2:uat:check`,
  `phase2:uat:ready`, and combined `test:uat` scripts.

## Task Commits

Task 1 followed the required RED then GREEN cycle:

1. **Task 1 RED: Define Phase 2 evidence gate contract** - `e0e26b4` (test)
2. **Task 1 GREEN: Implement secret-safe Phase 2 UAT gates** - `89def4d` (feat)
3. **Task 2: Define Phase 2 UAT evidence runbook** - `3ad7b66` (docs)
4. **Deviation: Align runbook with exact production gate CLI** - `81cf9b7` (fix)

## Files Created/Modified

- `scripts/check-phase2-uat-evidence.mjs` - Fixed evidence parser plus schema, migration,
  deployment, readiness, and release-input gates.
- `scripts/check-phase2-uat-evidence.test.mjs` - Positive and fail-closed tests for every
  evidence, privacy, fabrication, and preflight class.
- `.planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md` - Exact 25-row
  non-fabricated PENDING ledger.
- `docs/phase-2-billing-and-fulfillment-uat.md` - Secret-safe production and provider UAT
  operator runbook.
- `package.json` - Phase 2 evidence commands and combined Phase 1/2 UAT test entry point.

## Decisions Made

- A provider-backed row must include canonical test-mode observation wording and a bounded
  provider object reference. Any mock, fixture, repository test, configuration-only,
  contract-only, or dry-run claim fails validation.
- The schema-parity row has a stronger contract: exact local and remote migration version,
  zero pending and dry-run counts, all nine named booleans, an ISO-8601 UTC observation, and
  the canonical environment.
- Deployment proof must contain the exact reviewed commit, `soji-web` project, production
  target, `READY` state, canonical alias, and public deployment identity. Missing commit
  metadata blocks the gate and must never be supplemented by hand.
- Release validation reads only permission-restricted path/commit files, requires a detached
  exact commit, checks tracked deployment inputs and required config, rejects dirty or
  untracked input, and scans for secret-like values.
- No external provider, production, login, configuration, migration, or deployment action was
  performed in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected shorthand runbook commands to the exact production CLI contract**

- **Found during:** Overall plan-to-runbook verification after Task 2
- **Issue:** The validator and its tests correctly implemented the plan's named options, but
  four runbook examples initially used shorthand positional arguments and placed the build
  checks in the release-preparation step rather than rerunning them as the first deployment
  step.
- **Fix:** Updated prepush, postpush, release-input, and deployment examples to use the exact
  named flags; moved the release-input rerun, detached build, and `deploy:check` sequence ahead
  of every production configuration, link, or deployment operation.
- **Files modified:** `docs/phase-2-billing-and-fulfillment-uat.md`
- **Verification:** Documentation links passed, exact CLI strings match Plan 02-06, and the
  complete evidence/test/docs gate passed.
- **Committed in:** `81cf9b7`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 runbook correctness fix)
**Impact on plan:** The correction made the operator guide match the already-tested CLI
contract without changing architecture, dependencies, or external state.

## Issues Encountered

- The installed Vercel CLI's JSON inspection path may omit authoritative commit metadata.
  The validator intentionally blocks such a capture. Plan 02-06 must obtain an authoritative
  machine-readable capture containing the real full commit or stop; adding the field manually
  is prohibited.

## Verification

- Focused Phase 2 validator suite: 18/18 passed in 2.19 seconds.
- Combined Phase 1 and Phase 2 UAT suite: 23/23 passed in 2.61 seconds.
- Evidence structure gate: exact 25 fixed scenarios passed.
- Positive pending assertion: all 25 rows exist exactly once and are `PENDING`.
- Documentation gate: 29 implemented API contracts and 38 local links passed.
- Secret, privacy, provider-fabrication, parser ambiguity, wrong identity, live-key, dirty
  release, and missing-config cases are covered by passing negative tests.
- All focused evidence, test, and docs checks completed in under 4 seconds.
- No production credentials, external mutations, provider logins, live Stripe calls, schema
  pushes, Vercel configuration, or deployments were used.

## Known Stubs

None. The 25 `PENDING` rows are intentional evidence targets for Plans 02-06 through 02-09,
not mock data or unwired implementation.

## User Setup Required

None for this plan. Later production and provider UAT plans require their explicitly authorized
secure environments and authentication gates.

## Next Phase Readiness

- Plan 02-06 can execute the exact prepush/postpush, production-schema, release-input,
  deployment, and canonical-readiness gates.
- Plans 02-07 and 02-08 have one fixed evidence target for every catalog, checkout, portal,
  receipt, recovery, product delivery, authorization, refund, and dispute scenario.
- Plan 02-09 can require all 25 rows to be genuine canonical `PASS` observations with
  `phase2:uat:ready`.
- Provider-backed evidence remains pending; no local result was treated as production proof.

## Self-Check: PASSED

- All five plan artifacts and this summary exist.
- Task and deviation commits `e0e26b4`, `89def4d`, `3ad7b66`, and `81cf9b7` exist in git
  history.
- The RED commit precedes the GREEN commit, and the combined Phase 1/2 suite passes.
- Evidence, pending-status, privacy/fabrication, documentation, and exact CLI checks pass.
- No goal-blocking stub or unplanned threat surface remains.

---
*Phase: 02-billing-and-fulfillment-uat*
*Completed: 2026-07-26*
