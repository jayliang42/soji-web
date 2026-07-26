---
phase: 02-billing-and-fulfillment-uat
verified: 2026-07-26T23:17:49Z
status: gaps_found
score: 0/5 must-haves verified
automated_plans_complete: 5/5
provider_plans_pending: 4/4
human_verification:
  - Authorized production schema, service-role, and Stripe test configuration
  - Three-tier Checkout, Customer reuse, Portal, and cancellation observations
  - Signed receipt, failure, Retry, and reconciliation observations
  - Product and membership refund/dispute transition observations
decision_coverage:
  honored: 25
  total: 25
  not_honored: []
---

# Phase 2: Billing and Fulfillment UAT Verification Report

**Phase Goal:** Customers can pay and receive the correct access, while the publisher can prove receipt and recover failed processing.
**Verified:** 2026-07-26T23:17:49Z
**Status:** gaps_found

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Each membership plan creates exactly one correct Stripe test subscription and Account reflects authoritative state. | ? NEEDS PROVIDER UAT | Checkout authority, Customer continuity, adjustment mapping, and Account fail-closed contracts are implemented and tested; no canonical Stripe test subscription has been observed. |
| 2 | Admin can find every test webhook receipt, including failed and ignored outcomes, and use supported recovery. | ? NEEDS PROVIDER UAT | The bounded incident ledger, Retry, reconciliation, leases, focus, and privacy contracts pass locally; no Stripe-signed canonical receipt or live recovery has been observed. |
| 3 | A product purchaser can access its private file while refund/dispute states enforce policy. | ? NEEDS PROVIDER UAT | Product access/refund/dispute state machines and download denial are covered locally; no real Stripe test purchase/refund/dispute sequence has been observed. |
| 4 | A customer can use Portal without fragmented Stripe Customer history. | ? NEEDS PROVIDER UAT | Server-owned Customer reuse and Portal ownership are implemented; actual Portal configuration, session, and cancellation synchronization remain unobserved. |
| 5 | Membership disputes pause, restore, end, or cancel access according to one policy. | ? NEEDS PROVIDER UAT | The documented partial/full/open/won/lost policy, atomic adjustment ordering, paid watermark, and reconciliation token are tested; provider-delivered transitions remain unobserved. |

**Score:** 0/5 truths fully verified against the canonical provider environment

## Automated Implementation Evidence

| Area | Result |
|---|---|
| Plans 02-01 through 02-05 | ✓ COMPLETE |
| Exact committed release closure | ✓ 212 explicit paths; manifest SHA-256 `6e84b9276ae1a2edd658ac41ba9770eb506cbf1ebfafdc63ffaef7ee6bec3020` |
| Deep code review | ✓ CLEAN — 0 Critical, 0 Warning across 36 reviewed files and direct release dependencies |
| Exact detached revision | ✓ `199a32e47e97199665690f599fda8fbf7a67d19d` |
| Frozen dependency install | ✓ lockfile current; 1,066 packages installed |
| Workspace typecheck | ✓ passed |
| Web unit/component suite | ✓ 547/547 across 76 files |
| Domain suite | ✓ 3/3 |
| Production build | ✓ Next.js build passed with 32 route entries |
| Deployment artifact | ✓ standalone artifact passed portability and environment-file checks |
| Database suite | ✓ 366/366 pgTAP |
| Schema reapply | ✓ focused Phase 2 pgTAP 97/97 after reapply |
| Generated database types | ✓ parity passed |
| Database lint | ✓ no schema errors |
| Evidence validator | ✓ 25/25 tests |
| Evidence ledger | ✓ exactly 25 rows, all `PENDING`, zero unsupported `PASS` |

## Requirements Coverage

| Requirement | Status | Blocking issue |
|---|---|---|
| BILL-01 | ? NEEDS PROVIDER UAT | Exact three-Price catalog and Portal configuration have not been observed in Stripe test mode. |
| BILL-02 | ? NEEDS PROVIDER UAT | Signed receipt, ignored event, recoverable failure, Retry, and reconciliation have not been observed on the canonical deployment. |
| BILL-03 | ? NEEDS PROVIDER UAT | Three tier purchases, Customer reuse, and Portal cancellation have not been completed with test identities. |
| BILL-04 | ? NEEDS PROVIDER UAT | Product purchase, private delivery, unauthorized denial, refunds, and disputes have not been exercised through Stripe. |
| BILL-05 | ? NEEDS PROVIDER UAT | Membership partial/full refund and open/won/lost dispute transitions have not been delivered by Stripe. |

**Coverage:** 0/5 requirements fully provider-verified; 5/5 have clean automated implementation contracts.

## Security and Correctness Closure

- Stripe Basil periods come from the single subscription item and fail closed when missing or ambiguous.
- Paid-payment watermarks make full-refund supersession independent of webhook delivery order.
- Customer reconciliation uses a database-issued, customer-bound, expiring, single-use token rather than an application clock.
- Synthetic reconciliation closure is repairable by later authoritative provider state; genuine provider-terminal state remains monotonic.
- Service-role schema probes pin the exact Supabase project origin before constructing secret-bearing headers and reject redirects.
- Admin search, Retry, reconciliation, lease, privacy, focus, and failure states are bounded and tested.
- Account suppresses all subscription, purchase, access, download, and mutation truth when session data is degraded.
- Migration evidence covers both `20260726000000_subscription_billing_adjustments.sql` and `20260726010000_database_reconciliation_tokens.sql`.

## Human / Authorized Provider Verification Required

### 1. Production schema and secure provider configuration

Apply only the two reviewed Phase 2 migrations after machine-parsed preflight. With explicit owner authorization, install the production Supabase service-role key, Stripe test secret, and canonical webhook signing secret in the dedicated `soji-web` project. Build and deploy only the exact clean commit after release-input, production-build, and deploy-artifact gates pass.

### 2. Catalog, Checkout, Customer reuse, and Portal

Verify the exact three Stripe test Prices and Portal configuration, complete one Checkout per tier, prove one Customer history and idempotent claim continuity, then cancel through Portal and observe canonical Account synchronization.

### 3. Receipt, failure, Retry, and reconciliation

Observe Stripe-signed processed and ignored receipts, force one recoverable processing failure, retry the original event, and run authoritative `sub_`/`cus_` reconciliation while recording only redacted suffixes.

### 4. Product and membership reversals

Using controlled test identities, prove private product delivery and unauthorized denial, then exercise product and membership partial refund, full refund, dispute open, dispute won, and dispute lost transitions.

## Gaps Summary

1. Plans `02-06` through `02-09` remain intentionally incomplete because they require production-secret authorization and canonical Stripe test-mode observations.
2. The evidence ledger remains exactly 25 `PENDING` rows. Repository tests, fixtures, configuration, and dry runs were not promoted to provider `PASS`.
3. The consolidated owner checkpoint will include Phase 1 identity/Admin actions and Phase 2 provider actions together after the remaining automatable phases are exhausted.

## Recommended Closure

No duplicate gap plans are needed. When the consolidated owner checkpoint is authorized:

1. Execute Plans `02-06` through `02-09` in order.
2. Promote only directly observed evidence rows.
3. Run `corepack pnpm phase2:uat:check`, `corepack pnpm phase2:uat:ready`, the full regression gate, and exact deployment/readiness parsers.
4. Rerun Phase 2 verification.

---
*Verified: 2026-07-26T23:17:49Z*
*Verifier: Codex*
