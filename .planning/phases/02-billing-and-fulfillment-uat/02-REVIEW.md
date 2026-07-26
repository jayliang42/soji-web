---
phase: 02-billing-and-fulfillment-uat
reviewed: 2026-07-26T23:14:23Z
depth: deep
reviewed_commit: 199a32e47e97199665690f599fda8fbf7a67d19d
files_reviewed: 36
files_reviewed_list:
  - supabase/migrations/20260726000000_subscription_billing_adjustments.sql
  - supabase/tests/subscription_billing_adjustments.sql
  - apps/web/src/lib/supabase/database.types.ts
  - supabase/schema.sql
  - apps/web/src/lib/stripe-webhook.ts
  - apps/web/src/lib/stripe-reconciliation.ts
  - apps/web/tests/checkout-routes.test.ts
  - apps/web/tests/stripe-webhook-sync.test.ts
  - apps/web/tests/stripe-reconciliation.test.ts
  - apps/web/src/lib/account-subscriptions.ts
  - apps/web/src/app/account/loading.tsx
  - apps/web/src/components/billing-portal-button.tsx
  - apps/web/tests/account-subscriptions.test.ts
  - apps/web/tests/account-billing-readiness-page.test.tsx
  - apps/web/src/app/account/page.tsx
  - apps/web/src/lib/billing.ts
  - apps/web/src/app/api/admin/billing-events/route.ts
  - apps/web/src/components/admin-billing-events.tsx
  - apps/web/tests/admin-billing-events-route.test.ts
  - apps/web/tests/admin-billing-events-component.test.tsx
  - packages/types/src/index.ts
  - scripts/check-phase2-uat-evidence.mjs
  - scripts/check-phase2-uat-evidence.test.mjs
  - docs/phase-2-billing-and-fulfillment-uat.md
  - package.json
  - apps/web/.env.example
  - apps/web/src/app/api/admin/billing-events/[id]/retry/route.ts
  - apps/web/tests/admin-billing-retry-route.test.ts
  - apps/web/src/lib/supabase/session.ts
  - supabase/migrations/20260726010000_database_reconciliation_tokens.sql
  - scripts/check-schema-idempotence.mjs
  - scripts/sync-supabase-types.mjs
  - supabase/config.toml
  - apps/web/src/lib/billing-processing.ts
  - apps/web/src/lib/billing-readiness.ts
  - apps/web/tests/session-failure-pages.test.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-26T23:14:23Z
**Depth:** deep
**Files Reviewed:** 36
**Exact HEAD:** `199a32e47e97199665690f599fda8fbf7a67d19d`
**Status:** clean

## Summary

The Phase 02 implementation and its direct release call graph were re-reviewed adversarially at exact committed `HEAD`. The three findings from the preceding review are fixed: the release source closure is committed, the evidence gate models both required migrations through `20260726010000_database_reconciliation_tokens.sql`, and Account fails closed whenever the retained session snapshot carries an error.

No Critical or Warning findings remain. The earlier fixes for Stripe Basil item-level periods, paid-payment ordering, database-issued reconciliation tokens, synthetic closure repair, Supabase-origin validation, retry-state refresh, invalid Admin search, deployment URL validation, and declarative schema parity remain intact.

## Narrative Findings (AI reviewer)

No BLOCKER or WARNING findings were identified.

### Release-closure verification

| Area | Result |
|---|---|
| Exact revision | The reviewed archive resolves to `199a32e47e97199665690f599fda8fbf7a67d19d`. Verification used archived committed sources rather than mutable working-tree source files. |
| Release manifest | The closure commit contains exactly 212 sorted paths. Its path-only manifest SHA-256 is `6e84b9276ae1a2edd658ac41ba9770eb506cbf1ebfafdc63ffaef7ee6bec3020`. Mobile, planning, documentation, vault, governance, seed, and publisher-setup material is excluded as intended. |
| Secret hygiene | Scans of the 212-path manifest, exact `HEAD`, and added source lines found placeholders and test-only synthetic values, but no committed production credential or private-key material. |
| Package reproducibility | `pnpm install --frozen-lockfile` accepted every workspace importer and reported that the lockfile was current before package retrieval. A full network download was unavailable in this sandbox; exact committed sources were therefore executed against the already-installed dependency graph. The preceding fix report independently records a completed frozen install at this same commit. |
| Compile and build | Workspace typecheck passed, including route-aware Web checks. The production Web build passed and emitted the expected application/API routes. The standalone deployment artifact check passed with no packaged environment files. |
| Automated tests | Domain tests passed 3/3; Web tests passed 547/547 across 76 files; the fixed Phase 02 evidence suite passed 25/25. |
| Database verification | Declarative schema reapplication passed; focused Phase 02 pgTAP passed 97/97; generated database types matched; database lint reported no schema errors; the full database suite passed 366/366. |

### Migration and evidence gate

The gate now treats these as one ordered required suffix:

1. `20260726000000_subscription_billing_adjustments.sql`
2. `20260726010000_database_reconciliation_tokens.sql`

Pre-push validation accepts the two valid pending shapes (both migrations pending or only the token migration pending) and the already-applied shape. Post-push validation requires exact local/remote parity with `20260726010000` as the latest version and zero pending/dry-run migrations. Regression cases reject missing, extra, duplicate, malformed, out-of-order, and incorrectly named migrations. The evidence document contains exactly 25 `BILL-*` scenarios, all intentionally `PENDING`, with no unsupported provider/production `PASS`.

### Fail-closed Account truth

`snapshot.error` now suppresses every billing-dependent claim and action:

- no subscription status, tier, entitlement, portal, or checkout truth;
- no purchase status, access state, or download action;
- no role-dependent management action derived from the degraded profile;
- no checkout-return confirmation presented as authoritative billing state.

The regression supplies an Account snapshot containing an error together with deliberately stale active-subscription, downloadable-purchase, and confirmed-checkout data. It proves that the unavailable state wins and those contradictory claims and mutations are absent.

### Security and correctness regression review

| Area | Result |
|---|---|
| Stripe Basil period | Subscription synchronization requires the single subscription item and uses its item-level `current_period_end`. |
| Paid watermark | Reconciliation persists provider payment identity and paid time, applies monotonic ordering, and prevents an older refund/dispute from superseding a later paid attempt. |
| Reconciliation token | Tokens are database-issued, customer-bound, short-lived, single-use, row-locked, and consumed transactionally. Expired, replayed, mismatched, and post-watermark cases are covered. |
| Synthetic repair | Reconciliation closure cannot overwrite a later provider sync, while a later real provider event can repair synthetic closure without regressing a genuine provider-terminal state. |
| SSRF boundary | Production schema probing derives one exact Supabase HTTPS origin from a validated project reference, rejects credentials/path/query/hash/port variants, disables redirects, and validates the response shape. |
| Retry route | Active leases and refreshed settled states are classified from authoritative rows; stale original state is not returned as retry truth. |
| Admin search | Invalid search input returns HTTP 400 before any database query; valid search is sanitized and constrained to the fixed allowlist. |
| Deployment URL | Production evidence requires HTTPS, a credential-free exact Vercel deployment hostname, root path, expected project/target/state, exact full commit, and canonical alias. |
| Schema parity | The tracked schema contains the final token API and constraints; schema reapply, generated types, focused/full pgTAP, and lint all pass. |

### External-state boundary

No live Stripe, Supabase production, or production deployment mutation was performed during this review. The 25 provider/production UAT observations remain intentionally pending; that expected external state is not a code-review defect.

All reviewed files meet the release-closure quality gate. No issues found.

---

_Reviewed: 2026-07-26T23:14:23Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
