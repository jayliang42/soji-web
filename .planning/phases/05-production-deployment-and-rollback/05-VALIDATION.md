---
phase: 05
slug: production-deployment-and-rollback
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-28
---

# Phase 05 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node test, Vitest 4, Playwright 1.61, Docker CLI, pgTAP |
| **Config file** | `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `.github/workflows/ci.yml` |
| **Quick run command** | `node --test scripts/check-phase5-*.test.mjs` |
| **Full suite command** | `corepack pnpm phase5:release:check` |
| **Estimated runtime** | ~8 minutes including browser, database, and container gates |

## Sampling Rate

- **After every task commit:** Run the focused Node/Vitest test named by the task.
- **After every plan wave:** Run Phase 5 parser/evidence tests plus Web lint/typecheck.
- **Before verification:** Run the exact detached release gate, full repository regression,
  image inspection/container rollback drill, docs, and evidence structure validation.
- **Max feedback latency:** 30 seconds for parser tasks; 180 seconds for container tasks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DEPLOY-01 | T-05-01 | Dirty/wrong release input cannot become deployment proof | Node unit/CLI | `node --test scripts/check-phase5-release.test.mjs` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DEPLOY-02 | T-05-02 | Smoke parsing is body-free, bounded, and fails closed | Node unit/HTTP | `node --test scripts/check-phase5-release.test.mjs` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | DEPLOY-01 | T-05-03 | Image is non-root and contains no secret/env input | artifact/container | `corepack pnpm phase5:container:check` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | DEPLOY-03 | T-05-04 | Local update and rollback use exact temporary targets | container integration | `corepack pnpm phase5:container:rollback` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | DEPLOY-01, DEPLOY-02, DEPLOY-03 | T-05-05 | Fixed proof classes reject fabricated live release evidence | Node unit | `node --test scripts/check-phase5-uat-evidence.test.mjs` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | DEPLOY-02, DEPLOY-03 | — | Full local release set passes and ready fails only on live rows | full | `corepack pnpm phase5:release:check` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 3 | DEPLOY-01, DEPLOY-02 | T-05-06 | Staged exact deployment cannot receive canonical traffic before gates | provider/live | `corepack pnpm phase5:uat:check` | evidence tooling W0 | ⬜ pending |
| 05-04-02 | 04 | 3 | DEPLOY-03 | T-05-07 | Rollback and re-promotion preserve readiness, cron, and schema history | provider/live | `corepack pnpm phase5:uat:ready` | evidence tooling W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `scripts/check-phase5-release.mjs` and `.test.mjs` — release, deployment-state,
  transition, and smoke parser.
- [ ] `scripts/check-phase5-container.mjs` and `.test.mjs` — bounded local image/update/rollback drill.
- [ ] `scripts/check-phase5-uat-evidence.mjs` and `.test.mjs` — fixed automated/live proof classes.
- [ ] Package commands for focused, full release, container, structure, and ready modes.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production settings and owner/provider prerequisites are complete | DEPLOY-01, DEPLOY-02 | External secret and account authority | Complete the existing consolidated owner checkpoint without recording values |
| Exact commit is staged without canonical domain assignment | DEPLOY-01 | Vercel mutation authority | Deploy with production target and skip-domain, then validate machine inspection |
| Canonical guest/customer/Admin smoke passes after promotion | DEPLOY-02 | Production roles and data authority | Promote the inspected deployment and record redacted role outcomes |
| Instant rollback and candidate re-promotion pass | DEPLOY-03 | Production routing authority | Roll back to prior production, smoke, re-promote candidate, smoke again |

## Validation Sign-Off

- [x] All tasks have automated verification or explicit Wave 0 dependencies.
- [x] Sampling continuity has no three consecutive tasks without automated proof.
- [x] Wave 0 names every missing test/tool artifact.
- [x] No watch-mode flags.
- [x] Task-level feedback target is under 180 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-28
