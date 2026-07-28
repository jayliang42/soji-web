---
phase: 04
slug: experience-and-operations-acceptance
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-28
---

# Phase 04 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4, Playwright 1.61, axe-core, pgTAP |
| **Config file** | `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `corepack pnpm --filter @soji/web test -- --run <target>` |
| **Full suite command** | `corepack pnpm --filter @soji/web test && corepack pnpm --filter @soji/web test:e2e` |
| **Estimated runtime** | ~150 seconds |

## Sampling Rate

- **After every task commit:** run the targeted Vitest or Playwright file named by the task.
- **After every plan wave:** run Web tests, lint, and typecheck.
- **Before verification:** run build, full Vitest, full desktop/mobile Playwright,
  database tests, generated-types parity, and Phase 4 evidence validation.
- **Max feedback latency:** 90 seconds for task-level checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UX-01 | T-04-01 | Degraded authority removes privileged actions | browser | `pnpm --filter @soji/web exec playwright test e2e/experience-acceptance.spec.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | UX-02 | T-04-02 | Admin actions remain explicit and focus-safe | unit/browser | `pnpm --filter @soji/web test -- admin-billing-events` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 1 | OPS-02 | T-04-03 | Alert payload is allowlisted and redacted | unit | `pnpm --filter @soji/web test -- observability` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 1 | OPS-02 | T-04-04 | Redirect/timeout/failure never changes original result | unit | `pnpm --filter @soji/web test -- observability` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 1 | OPS-02 | Exact secret and stable denial | unit/route | `pnpm --filter @soji/web test -- cron-auth product-asset-cleanup-route` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 1 | OPS-02 | Aggregate response; partial failure remains retryable | unit/route | `pnpm --filter @soji/web test -- product-asset-cleanup` | ✅ | ⬜ pending |
| 04-04-01 | 04 | 2 | OPS-02, UX-01, UX-02 | T-04-05 | Proof classes cannot fabricate live evidence | unit | `corepack pnpm phase4:uat:check` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 2 | OPS-02, UX-01, UX-02 | — | All automated gates pass together | full | `corepack pnpm verify` | ✅ | ⬜ pending |

## Wave 0 Requirements

- [ ] `apps/web/e2e/experience-acceptance.spec.ts` — workflow/state matrix.
- [ ] `scripts/validate-phase4-evidence.mjs` and tests — fixed evidence contract.
- Existing Vitest, Playwright, axe, pgTAP, and CI infrastructure covers all other work.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production operations receiver gets a controlled redacted payment-failure alert | OPS-02 | External receiver authority | Trigger controlled failure, record UTC/event code/outcome only |
| Production scheduler invokes cleanup with the real secret | OPS-02 | Provider scheduler and secret authority | Invoke configured schedule, record aggregate result only |
| Privileged production Admin states match the canonical receipt/processing rows | UX-02 | Production data authority | Inspect representative received/failed/ignored/retried/reconciled rows |

## Validation Sign-Off

- [x] Every task has an automated command or explicit Wave 0 dependency.
- [x] No three consecutive tasks lack automated verification.
- [x] Wave 0 names every missing test artifact.
- [x] No watch-mode flags.
- [x] Task feedback target is under 90 seconds.
- [x] `nyquist_compliant: true`.

**Approval:** approved 2026-07-28

