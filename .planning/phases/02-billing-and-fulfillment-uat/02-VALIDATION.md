---
phase: 02
slug: billing-and-fulfillment-uat
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-26
revised: 2026-07-26
---

# Phase 02 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Frameworks | Vitest, Playwright, pgTAP, Node test, TypeScript, ESLint |
| Focused target | Every implementation task uses one sub-30-second file-scoped command |
| Wave gate | Full applicable Web/database/static suite after the focused task checks |
| Final gate | Web + database + type + lint + build + artifact + focused Playwright/axe + evidence ready + docs |
| Provider rule | Mocks/config/repository tests never promote provider scenario rows to PASS |
| Human review | One end-of-phase `<human-check>` in autonomous Task 02-09-03; no standalone checkpoint |

## Fixed Evidence Scenarios

Exactly these 25 IDs exist once in `02-UAT-EVIDENCE.md`:

1. `BILL-DB-SCHEMA-PARITY`
2. `BILL-01-CATALOG`
3. `BILL-01-PORTAL-CONFIG`
4. `BILL-03-TIER-1-CHECKOUT`
5. `BILL-03-TIER-2-CHECKOUT`
6. `BILL-03-TIER-3-CHECKOUT`
7. `BILL-03-CUSTOMER-REUSE`
8. `BILL-03-PORTAL-CANCEL`
9. `BILL-02-SIGNED-RECEIPT`
10. `BILL-02-IGNORED-RECEIPT`
11. `BILL-02-FAILED-RETRY`
12. `BILL-02-RECONCILIATION`
13. `BILL-04-PRODUCT-CATALOG`
14. `BILL-04-PRODUCT-DELIVERY`
15. `BILL-04-UNAUTHORIZED-DOWNLOAD`
16. `BILL-04-PARTIAL-REFUND`
17. `BILL-04-FULL-REFUND`
18. `BILL-04-DISPUTE-OPEN`
19. `BILL-04-DISPUTE-WON`
20. `BILL-04-DISPUTE-LOST`
21. `BILL-05-PARTIAL-REFUND`
22. `BILL-05-FULL-REFUND`
23. `BILL-05-DISPUTE-OPEN`
24. `BILL-05-DISPUTE-WON`
25. `BILL-05-DISPUTE-LOST`

## Per-Task Verification Map

| Task ID | Wave | Requirements | Secure behavior | Focused automated command | Status |
|---|---:|---|---|---|---|
| 02-01-01 | 1 | BILL-03, BILL-05 | RED reaches TAP plan, matches two unique named `not ok`, rejects syntax/connection/Bail out | focused named pgTAP expected-failure shell gate in Plan 01 | ⬜ |
| 02-01-02 | 1 | BILL-03, BILL-05 | Ordered atomic adjustment/access/RLS/grants/readiness | `supabase test db --local supabase/tests/subscription_billing_adjustments.sql && pnpm db:schema:check` | ⬜ |
| 02-01-03 | 1 | BILL-03, BILL-05 | Generated schema/RPC contracts | `pnpm db:types && pnpm db:types:check && pnpm --filter @soji/web typecheck` | ⬜ |
| 02-02-01 | 2 | BILL-01, BILL-03 | Client authority rejected; Customer/claim/idempotency continuity | `pnpm --filter @soji/web exec vitest run tests/checkout-routes.test.ts` | ⬜ |
| 02-02-02 | 2 | BILL-02, BILL-04, BILL-05 | Exact InvoicePayment classification and mutually exclusive dispatch | `pnpm --filter @soji/web exec vitest run tests/stripe-webhook-sync.test.ts` | ⬜ |
| 02-02-03 | 2 | BILL-02, BILL-05 | Paid evidence, lease, Retry, reconciliation | focused reconciliation/processing/retry/reconcile Vitest files | ⬜ |
| 02-03-01 | 3 | BILL-03, BILL-05 | Owner-scoped fail-closed presentation | `pnpm --filter @soji/web exec vitest run tests/account-subscriptions.test.ts` | ⬜ |
| 02-03-02 | 3 | BILL-03, BILL-04, BILL-05 | Exact loading status/geometry/no false flash | focused Account/return/download Vitest files | ⬜ |
| 02-04-01 | 4 | BILL-02 | Auth-first bounded event search and stable mapping | focused Admin route + billing Vitest files | ⬜ |
| 02-04-02 | 4 | BILL-02, BILL-05 | Receipt/process/lease/recovery UI truth | focused Admin component/retry/reconcile Vitest files | ⬜ |
| 02-05-01 | 5 | BILL-01..05 | Evidence safety, tested positive `--require-all-status`, schema-aware `--require-pass`, and machine-parsed production/canonical/release gates | `node --test scripts/check-phase2-uat-evidence.test.mjs` | ⬜ |
| 02-05-02 | 5 | BILL-01..05 | Exactly all 25 fixed rows pending; malformed/parser/script errors rejected | structure + unit + docs + `--require-all-status PENDING` | ⬜ |
| 02-06-01 | 6 | BILL-01..05 | Machine-parsed pre/post migration/dry-run plus schema-specific PASS evidence; inputs retained through verify | prepush + postpush + production-schema + structure + `--require-pass BILL-DB-SCHEMA-PARITY`, then Task 2 cleanup | ⬜ |
| 02-06-02 | 6 | BILL-01..05 | Exact clean commit detached-worktree release-input preflight with no production mutation | `--release-inputs --worktree-file ... --commit-file ...` | ⬜ |
| 02-06-03 | 6 | BILL-01..05 | T-02-14 gates before mutation, then exact Vercel identity plus canonical readiness | detached build + deploy-artifact check before link/deploy; deployment + production-schema + canonical-readiness validators after | ⬜ |
| 02-07-01 | 7 | BILL-01 | Provider catalog/Portal config observation | structure + `--require-pass BILL-01-CATALOG,BILL-01-PORTAL-CONFIG` | ⬜ |
| 02-07-02 | 7 | BILL-03 | Exactly four rows: three tiers plus Customer reuse | structure + `--require-pass` four exact BILL-03 IDs | ⬜ |
| 02-07-03 | 7 | BILL-01, BILL-03 | Exact Portal ownership/cancellation sync | structure + `--require-pass BILL-03-PORTAL-CANCEL` | ⬜ |
| 02-08-01 | 8 | BILL-02 | Signed processed/ignored receipt-first evidence | structure + `--require-pass` signed,ignored | ⬜ |
| 02-08-02 | 8 | BILL-02 | Real recoverable failure and original-event Retry | structure + `--require-pass BILL-02-FAILED-RETRY` | ⬜ |
| 02-08-03 | 8 | BILL-02 | sub_/cus_ reconciliation and synthetic receipt | structure + `--require-pass BILL-02-RECONCILIATION` | ⬜ |
| 02-09-01 | 9 | BILL-04 | Exactly eight product catalog/delivery/denial/refund/dispute rows | structure + `--require-pass` eight exact BILL-04 IDs | ⬜ |
| 02-09-02 | 9 | BILL-05 | Five membership refund/dispute policy rows | structure + `--require-pass` five exact BILL-05 IDs | ⬜ |
| 02-09-03 | 9 | BILL-01..05 | Fresh postpush/schema/deployment/canonical parsers, all-25 ready, full regression, one HUMAN-UAT | full final command in Plan 09 | ⬜ |

## Sampling Rules

- After each implementation task: run only its focused command; maximum target latency is 30 seconds.
- After each sequential wave: run the applicable full Web or database suite, typecheck, and lint outside the task-local RED/GREEN loop.
- Playwright and full suites are wave/final gates only, never task-local implementation gates.
- After every provider evidence edit: structure check plus task-owned `--require-pass ID[,ID...]`.
- Before provider UAT: machine-parse migration versions/dry-runs, remote readiness booleans, and exact Vercel commit/deployment identity.
- In Task 02-06-03, rerun release-input validation and pass the detached exact-commit production build plus deploy-artifact check before any Vercel/Stripe configuration, link, or deploy mutation.
- Before closeout: run the Plan 02-09-03 final automated command; only then expose its `<human-check>`.

## Provider/Manual-Only Assertions

| Plan | Assertions |
|---|---|
| 02-07 | Exact three-Price catalog, one subscription per tier, Customer reuse, claim/idempotency reuse, Portal cancellation |
| 02-08 | Stripe-signed received/ignored/failed receipts, Retry, reconciliation |
| 02-09 | Product owner/unauthorized delivery, product and membership partial/full/open/won/lost transitions |

Provider observations must be Stripe test mode against `https://soji-web.vercel.app`. No live payment is authorized.

## Final HUMAN-UAT Contract

Plan `02-09`, Task `02-09-03` remains `type="auto"` and `autonomous: true`. Its `<verify>` contains one `<human-check>` harvested by execute-phase after all automation. It must not create a standalone checkpoint or clear/override `_auto_chain_active`.

## Validation Sign-Off

- [x] Nine sequential plans and 24 task IDs are mapped.
- [x] Every implementation task has a focused sub-30-second command.
- [x] RED gate requires TAP plan plus two unique named `not ok` assertions and rejects syntax/connection/Bail out.
- [x] Full/Playwright suites occur only at wave/final gates.
- [x] Provider tasks require exact owned PASS IDs; mocks cannot promote PASS.
- [x] ASVS HIGH threats map to blocking verification.
- [x] Exactly one end-of-phase HUMAN-UAT review remains.
