---
phase: 3
slug: launch-content-and-customer-policy
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-26
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React server rendering, pgTAP/Supabase CLI, Playwright |
| **Config files** | `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `supabase/config.toml` |
| **Quick run command** | `corepack pnpm --filter @soji/web test -- tests/content-access.test.ts tests/launch-inputs.test.ts` |
| **Full suite command** | `corepack pnpm --filter @soji/web test && corepack pnpm --filter @soji/web typecheck && corepack pnpm --filter @soji/web lint && corepack pnpm --filter @soji/web build` |
| **Estimated runtime** | ~45 seconds quick; ~6 minutes complete with database/browser gates |

## Sampling Rate

- **After every task commit:** Run the targeted test files named by that task.
- **After every plan wave:** Run the Web full suite; include database gates for schema waves and Playwright for UI waves.
- **Before phase verification:** Typecheck, lint, full Web tests, full database tests, generated-type parity, production build, and browser accessibility/public-flow gates must be green.
- **Max feedback latency:** 45 seconds for Web-only tasks; 120 seconds for database tasks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CONT-01 | T-03-01 | Preview/full data is explicit and revision-safe | pgTAP + types | focused database access + type parity | ✅ existing infrastructure | ⬜ pending |
| 03-01-02 | 01 | 1 | CONT-01 | Restricted body sentinel absent from preview HTML | unit/component | targeted content access/card/page tests | ✅ extend existing | ⬜ pending |
| 03-02-01 | 02 | 1 | OPS-01 | Unsafe/placeholder targets rejected | unit/route | launch-input + Admin Office Hours tests | ✅ extend existing | ⬜ pending |
| 03-02-02 | 02 | 1 | OPS-01 | Unauthorized projection contains no href | unit/component | Office Hours presentation + failure-page tests | ✅ extend existing | ⬜ pending |
| 03-03-01 | 03 | 1 | OPS-03 | Policy routes are static, accessible, and discoverable | component/source | policy/footer/sitemap tests | ❌ Wave task creates | ⬜ pending |
| 03-03-02 | 03 | 1 | OPS-03 | Checkout requires valid review/config state and Terms consent | route/unit | checkout/readiness tests | ✅ extend existing | ⬜ pending |
| 03-04-01 | 04 | 2 | CONT-01 | Owned cover and flagship content pass launch validator | unit/build | asset validation + seed/content tests | ❌ Wave task creates | ⬜ pending |
| 03-04-02 | 04 | 2 | CONT-01, OPS-01, OPS-03 | Evidence never fabricates provider/owner PASS | unit/CLI | Phase 3 evidence validator | ❌ Wave task creates | ⬜ pending |
| 03-05-01 | 05 | 3 | CONT-01, OPS-01, OPS-03 | Responsive/accessibility and leak boundaries hold end-to-end | Playwright | targeted + full browser specs | ✅ extend existing | ⬜ pending |

## Wave 0 Requirements

Existing Vitest, React static rendering, Playwright, Supabase CLI, pgTAP, and generated-type synchronization infrastructure covers the phase. New test files are created in their owning implementation tasks; no framework installation or watch-mode setup is required.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Durable public support channel responds | OPS-03 | Owner-selected external service/contact | Open canonical `/support`, follow the exact public action, and record a redacted successful response |
| Signup and replay destinations work | OPS-01 | Exact provider URLs are owner-supplied | Use an entitled canonical test user; open each action and record destination type/success without storing the URL |
| Stripe shows Terms acceptance | OPS-03 | Dashboard policy URL and hosted UI | Start test Checkout and confirm required Terms checkbox/link before payment |
| Policy/business approval | OPS-03 | Legal/business judgment | Owner/legal reviewer confirms current revision and sets the production approval flag |
| Representative production access states | CONT-01 | Requires production users/entitlements | Observe guest preview, signed-in lock, and entitled full page at canonical origin |

## Validation Sign-Off

- [x] All planned tasks have an automated sample or explicit manual provider gate.
- [x] Sampling continuity: no three consecutive tasks lack automated verification.
- [x] Existing infrastructure covers all prerequisites.
- [x] No watch-mode flags are used.
- [x] Target feedback latency is under 45 seconds Web / 120 seconds database.
- [x] `nyquist_compliant: true` is set.

**Approval:** approved 2026-07-26
