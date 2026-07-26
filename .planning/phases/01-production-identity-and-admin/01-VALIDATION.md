---
phase: 01
slug: production-identity-and-admin
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-26
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, Playwright, pgTAP, TypeScript, ESLint |
| **Config files** | `apps/web/vitest.config.mts`, `apps/web/playwright.config.ts`, `supabase/config.toml`, `apps/web/tsconfig.typecheck.json` |
| **Quick run command** | `corepack pnpm --filter @soji/web test -- tests/login-page.test.tsx tests/auth-callback-route.test.ts tests/auth-recovery.test.ts` |
| **Full suite command** | `corepack pnpm --filter @soji/web test && corepack pnpm --filter @soji/web test:e2e` |
| **Estimated runtime** | Quick: under 30 seconds; full Web unit/browser suite: approximately 5–10 minutes |

---

## Sampling Rate

- **After every authentication task:** Run `corepack pnpm --filter @soji/web test -- tests/env.test.ts tests/login-page.test.tsx tests/auth-callback-route.test.ts tests/auth-recovery.test.ts tests/reset-password-page.test.tsx`.
- **After every Admin/readiness task:** Run `corepack pnpm --filter @soji/web test -- tests/auth-bootstrap-route.test.ts tests/profile-bootstrap.test.ts tests/admin-user-roles-route.test.ts tests/admin-launch-checklist.test.ts tests/readiness.test.ts tests/health-routes.test.ts`.
- **After the UI task:** Run `corepack pnpm --filter @soji/web test:e2e -- --grep "login|authentication|accessibility"`.
- **After every plan wave:** Run `corepack pnpm --filter @soji/web test`.
- **Before phase verification:** Run Web unit tests, Playwright, database tests, typecheck, lint, build, deploy artifact check, and docs check.
- **Max automated feedback latency:** 10 minutes for the full phase gate; 30 seconds for task-local feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01, AUTH-02 | T-01-01, T-01-03 | Signup and OAuth callbacks use the canonical origin and a validated local destination | unit | `corepack pnpm --filter @soji/web test -- tests/env.test.ts tests/auth-callback-route.test.ts tests/auth-recovery.test.ts` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-01 | T-01-02 | Browser UI maps provider failures to stable Soji messages and does not enumerate accounts | unit/component | `corepack pnpm --filter @soji/web test -- tests/login-page.test.tsx tests/auth-recovery.test.ts` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-01, AUTH-02 | T-01-01, T-01-02 | Login/signup/confirmation states remain keyboard-complete and accessible on desktop/mobile | browser | `corepack pnpm --filter @soji/web test:e2e -- --grep "login|authentication|accessibility"` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 1 | INFRA-01 | T-01-03, T-01-08 | UAT records only secret-free readiness and canonical-domain evidence | docs/contract | `corepack pnpm docs:check` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 1 | ADMIN-01 | T-01-05, T-01-06, T-01-07 | First Admin evidence remains one-time; later changes use audited RPC and protect the final Admin | unit/database | `corepack pnpm --filter @soji/web test -- tests/admin-user-roles-route.test.ts tests/admin-launch-checklist.test.ts && corepack pnpm test:db` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | AUTH-01 | T-01-04 | Production SMTP delivers confirmation and recovery without rewritten links | manual UAT | `corepack pnpm docs:check` after recording outcomes | ✅ | ⬜ pending |
| 01-03-02 | 03 | 2 | AUTH-02 | T-01-01, T-01-03 | Google returns through the exact canonical callback and preserves the intended path | manual UAT | `corepack pnpm docs:check` after recording outcomes | ✅ | ⬜ pending |
| 01-03-03 | 03 | 2 | INFRA-01, ADMIN-01 | T-01-05, T-01-06, T-01-08 | Supabase readiness, live session source, Admin workspaces, and role audit are proven without secret leakage | manual UAT | `corepack pnpm docs:check` after recording outcomes | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Vitest, Playwright, pgTAP, TypeScript, ESLint, build, deploy-artifact, and documentation checks cover all Phase 1 requirements. No new test framework or shared fixture infrastructure is required before implementation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirmation email delivery to two mailbox providers | AUTH-01 | Requires production SMTP reputation, DNS, and external inboxes | Register two labeled UAT accounts on the canonical site, record delivery/confirmation outcomes without addresses or tokens |
| Password recovery and new-password login | AUTH-01 | Requires a real one-time email link and production Auth session | Request recovery, open the newest email, update the password, sign out, and sign in with the new password |
| Google consent and canonical callback | AUTH-02 | Requires the configured Google/Supabase production providers | Start from a protected destination, complete Google consent, and verify the final canonical path plus `/api/me` source |
| Production migration/readiness evidence | INFRA-01 | Requires linked production Supabase and service-role credentials | Review migration parity, inspect the required readiness booleans, and confirm demo mode is disabled |
| Historical first-Admin and later role audit | ADMIN-01 | Requires production audit rows and an additional UAT identity | Verify the original bootstrap row, grant/revoke a second Admin through Users, and confirm final-Admin rejection |

---

## Validation Sign-Off

- [x] All provisional tasks have automated verification or an explicit manual-only reason.
- [x] Sampling continuity has no three consecutive tasks without an automated check.
- [x] Existing infrastructure covers all required automated references.
- [x] Commands use non-watch modes.
- [x] Task-local feedback latency target is under 30 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** ready for plan verification on 2026-07-26
