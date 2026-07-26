---
phase: 02
slug: billing-and-fulfillment-uat
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-26
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, Playwright, pgTAP, Node test, TypeScript, ESLint |
| **Config files** | `apps/web/vitest.config.mts`, `apps/web/playwright.config.ts`, `supabase/config.toml`, `apps/web/tsconfig.typecheck.json` |
| **Quick run command** | `corepack pnpm --filter @soji/web exec vitest run tests/stripe-webhook-sync.test.ts tests/stripe-webhook-route.test.ts tests/account-subscriptions.test.ts` |
| **Full suite command** | `corepack pnpm --filter @soji/web test && corepack pnpm test:db && corepack pnpm --filter @soji/web test:e2e` |
| **Estimated runtime** | Quick: under 30 seconds; full billing/database/browser gate: approximately 10–15 minutes |

---

## Sampling Rate

- **After every schema task:** Run the focused membership-adjustment pgTAP file, schema lint, and generated-type check.
- **After every Stripe processor task:** Run the focused webhook, reconciliation, refund, and dispute Vitest files.
- **After every Account/Admin task:** Run focused subscription, purchase, billing-event route, and component tests.
- **After every evidence task:** Run the Phase 2 Node validator suite and structure/safety gate.
- **After every plan wave:** Run the full Web Vitest suite plus the applicable database tests.
- **Before phase verification:** Run Web, database, Playwright, typecheck, lint, build, deploy artifact, docs, and evidence gates.
- **Max automated feedback latency:** 15 minutes for the full phase gate; 30 seconds for task-local feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | BILL-03, BILL-05 | T-02-02, T-02-03 | Membership adjustments have normalized provider identity, observation ordering, and terminal-state constraints | database | `corepack pnpm test:db` | ✅ infrastructure | ⬜ pending |
| 02-01-02 | 01 | 1 | BILL-03, BILL-05 | T-02-02 | Subscription state and adjustment sync share one atomic entitlement recomputation and cannot regrant blocked access | database | `corepack pnpm test:db && corepack pnpm db:schema:check` | ✅ infrastructure | ⬜ pending |
| 02-01-03 | 01 | 1 | BILL-05 | T-02-03, T-02-09 | New schema is represented by one forward migration, declarative schema, grants/RLS tests, and generated types | schema | `corepack pnpm db:lint && corepack pnpm db:schema:check && corepack pnpm db:types:check` | ✅ infrastructure | ⬜ pending |
| 02-02-01 | 02 | 2 | BILL-02, BILL-05 | T-02-01, T-02-07 | A PaymentIntent maps only through exact Invoice Payment and subscription parent evidence; missing/ambiguous mappings fail or ignore explicitly | unit | `corepack pnpm --filter @soji/web exec vitest run tests/stripe-webhook-sync.test.ts` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 2 | BILL-02, BILL-04, BILL-05 | T-02-02, T-02-04 | Product and subscription refunds/disputes dispatch to different idempotent state machines | unit/route | `corepack pnpm --filter @soji/web exec vitest run tests/stripe-webhook-sync.test.ts tests/stripe-webhook-route.test.ts` | ✅ | ⬜ pending |
| 02-02-03 | 02 | 2 | BILL-02 | T-02-04, T-02-06 | Duplicate delivery, Retry, lease expiry, ignored events, and reconciliation preserve one durable minimized receipt | unit/route | `corepack pnpm --filter @soji/web exec vitest run tests/billing-processing.test.ts tests/stripe-reconciliation.test.ts tests/admin-billing-retry-route.test.ts tests/admin-billing-reconcile-route.test.ts` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 3 | BILL-03, BILL-05 | T-02-05 | Account labels open/won/lost/full/partial states without treating Portal or return queries as authority | component | `corepack pnpm --filter @soji/web exec vitest run tests/account-subscriptions.test.ts tests/account-billing-readiness-page.test.tsx tests/checkout-return.test.ts` | ✅ | ⬜ pending |
| 02-03-02 | 03 | 3 | BILL-02 | T-02-06 | Admin distinguishes receipt and processing outcomes and exposes only supported bounded recovery actions | component/route | `corepack pnpm --filter @soji/web exec vitest run tests/admin-billing-events-component.test.tsx tests/admin-billing-events-route.test.ts tests/admin-billing-retry-route.test.ts tests/admin-billing-reconcile-route.test.ts` | ✅ | ⬜ pending |
| 02-03-03 | 03 | 3 | BILL-01, BILL-02, BILL-03, BILL-04, BILL-05 | T-02-06 | Phase 2 evidence requires fixed scenarios, rejects secrets/customer identifiers, and cannot become ready without all provider rows PASS | Node contract | `corepack pnpm phase2:uat:check && corepack pnpm test:uat` | ✅ infrastructure | ⬜ pending |
| 02-04-01 | 04 | 4 | BILL-01, BILL-03 | T-02-05 | Each plan produces one correct test subscription, reuses one Customer history, and opens Portal from the bound local subscription | manual UAT | `corepack pnpm phase2:uat:check` after recording redacted outcomes | ✅ infrastructure | ⬜ pending |
| 02-04-02 | 04 | 4 | BILL-02 | T-02-04, T-02-06 | Signed received/processed/ignored/failed receipts and supported Retry/reconciliation are observed in production Admin | manual UAT | `corepack pnpm phase2:uat:check` after recording redacted outcomes | ✅ infrastructure | ⬜ pending |
| 02-04-03 | 04 | 4 | BILL-04, BILL-05 | T-02-02, T-02-05 | Product and membership refund/dispute transitions enforce the documented access policy and unauthorized download denial | manual UAT | `corepack pnpm phase2:uat:ready` after all observations | ✅ infrastructure | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

The repository already has the required Vitest, Playwright, pgTAP, Node test,
TypeScript, ESLint, schema, build, and artifact infrastructure. Each new
membership-adjustment behavior will add tests before or in the same task as its
implementation; no framework installation or shared harness is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exact three-Price catalog and Customer Portal configuration | BILL-01 | Requires the actual Stripe test account configuration | Validate lookup key, active recurring Price, USD amount, monthly interval, and Portal access; record redacted Price suffixes only |
| One test subscription per tier and Customer reuse | BILL-03 | Requires authenticated canonical Checkout and provider-created objects | Complete each tier scenario in test mode, verify local Account state, Stripe Customer continuity, and no duplicate live subscription |
| Signed receipt, failure, ignored, Retry, and reconciliation | BILL-02 | Requires Stripe-to-deployment signed delivery and production Admin | Deliver controlled events, verify receipt-first states, force a processing failure, use the supported recovery action, and record only redacted identifiers |
| Product purchase and private fulfillment | BILL-04 | Requires real test Checkout plus two user identities | Purchase one active product, verify owner download, then verify a different signed-in user and a signed-out user are denied |
| Product/membership refunds and disputes | BILL-04, BILL-05 | Requires Stripe test refund and dispute state transitions | Exercise partial/full refund and open/won/lost dispute states; verify Account, entitlements, downloads, and Admin receipt outcomes after each webhook |

---

## Validation Sign-Off

- [x] Every provisional task has an automated check or explicit provider-only reason.
- [x] Sampling continuity has no three consecutive tasks without an automated check.
- [x] Existing infrastructure covers all required framework references.
- [x] Commands use non-watch modes.
- [x] Task-local feedback latency target is under 30 seconds.
- [x] Security behavior and threat references are mapped per task.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** ready for plan verification on 2026-07-26
