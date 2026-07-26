---
phase: 02-billing-and-fulfillment-uat
reviewed: 2026-07-26T20:33:36Z
depth: deep
files_reviewed: 25
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
findings:
  critical: 4
  warning: 3
  info: 0
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-26T20:33:36Z  
**Depth:** deep  
**Files Reviewed:** 25  
**Status:** issues_found

## Summary

The database adjustment authority, Stripe event classifier, reconciliation path, Account presentation, Admin incident ledger, and production-evidence CLI were traced across module boundaries and compared with D-01 through D-25 and BILL-01 through BILL-05. The implementation has four ship-blocking correctness/security defects: it reads a period field removed by the pinned Stripe Basil contract, does not persist the paid-payment ordering watermark needed for delivery-order independence, can permanently cancel a subscription created concurrently with customer reconciliation, and can disclose the Supabase service-role key to an arbitrary HTTPS origin. Three additional defects weaken Admin recovery truth and the release gate.

Focused verification still passes: 157/157 selected Web tests, 23/23 UAT validator tests, and strict Web typecheck. Those results do not exercise the adversarial sequences below.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Stripe Basil period lookup always falls through to an indefinite local entitlement

**Classification:** BLOCKER  
**Files:** `apps/web/src/lib/stripe-webhook.ts:129-134`, `supabase/migrations/20260726000000_subscription_billing_adjustments.sql:217-235`, `apps/web/src/app/account/page.tsx:199-232`, `apps/web/tests/stripe-webhook-sync.test.ts:30-41`

**Issue:** `getCurrentPeriodEnd` casts a current `Stripe.Subscription` to an invented `current_period_end` property. Under the repository's pinned Stripe 18.5/Basil API, the period is on each `SubscriptionItem` (`subscription.items.data[*].current_period_end`), not on `Subscription`. The cast hides that contract mismatch, so normal provider objects produce `undefined`. Supabase then receives the RPC default `null`; the access helper creates active/trialing subscription entitlements with `ends_at = null`, and Account falls back to `Recorded` instead of `Renews`, `Trial ends`, or `Access through`. If the terminal webhook is delayed or lost, access has no period-end safety bound. The main subscription fixture omits `items` and the assertion never checks `p_current_period_ends_at`, so the focused suite passes while modeling an invalid provider shape.

**Fix:** Derive the period from the validated membership subscription item and fail closed when it is missing or ambiguous. For the one-item v1 catalog, require exactly one membership item and pass its `current_period_end`:

```ts
function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const items = subscription.items.data;
  if (items.length !== 1 || !items[0]?.current_period_end) {
    throw new Error("stripe_subscription_period_missing");
  }
  return new Date(items[0].current_period_end * 1000).toISOString();
}
```

Use a complete Basil-shaped fixture and assert the exact RPC period argument plus Account renewal/cancel-at-period-end output.

### CR-02: A newer paid payment cannot defeat a late-delivered older full refund

**Classification:** BLOCKER  
**Files:** `supabase/migrations/20260726000000_subscription_billing_adjustments.sql:544-580`, `supabase/migrations/20260726000000_subscription_billing_adjustments.sql:591-665`, `supabase/tests/subscription_billing_adjustments.sql:390-572`, `apps/web/src/lib/stripe-reconciliation.ts:88-109`

**Issue:** `reconcile_stripe_subscription_paid_payment` records a paid payment only by updating full-refund rows that already exist. It stores no per-subscription latest-paid timestamp/payment watermark. Therefore event delivery order changes entitlement outcome:

1. payment B (provider time 12:04) is reconciled before any refund row exists, so the RPC persists nothing;
2. an older full-refund event for payment A (provider time 12:02) arrives later;
3. adjustment sync inserts an unsuperseded blocking row and immediately revokes access;
4. payment B will not necessarily be observed again, so the block remains indefinitely.

This violates D-10/D-12's provider-time monotonicity and makes Retry/reconciliation order-dependent. The pgTAP sequence covers only `refund -> later payment`, never `later payment -> older refund`.

**Fix:** Persist the latest verified paid PaymentIntent ID and paid timestamp under the subscription advisory lock, even when no refund exists. When a full refund is inserted or updated, atomically compare it with that watermark and create it already superseded when the paid timestamp is later. Add both delivery orders, duplicate replay, equal-time, and older-payment pgTAP cases.

### CR-03: Customer reconciliation can permanently cancel a concurrently created subscription

**Classification:** BLOCKER  
**Files:** `apps/web/src/lib/stripe-reconciliation.ts:141-158`, `apps/web/src/lib/stripe-webhook.ts:204-244`, `supabase/migrations/20260726000000_subscription_billing_adjustments.sql:339-353`, `apps/web/tests/stripe-webhook-sync.test.ts:1087-1128`

**Issue:** Customer reconciliation first builds a remote ID set and only afterwards queries all local customer subscriptions. A Checkout/webhook can create a remote and local subscription between those two operations. That new local row was not in the earlier remote snapshot, so `closeMissingCustomerSubscriptions` marks it `canceled`. The SQL terminal-state guard then rejects every later active/trialing refresh for that provider subscription, making the erroneous cancellation and access revocation permanent. The test supplies a static local list and cannot exercise the interleaving.

**Fix:** Give reconciliation a start watermark and close only local rows that existed before that watermark, with an atomic compare-and-set on their prior observation/version. Prefer a database RPC that accepts the remote set plus reconciliation start time and locks/checks candidates before cancellation. Track synthetic missing-provider closure separately or otherwise permit a later authoritative current-provider observation to repair it. Add a test that inserts a subscription after remote enumeration but before stale closure.

### CR-04: The production schema probe sends the service-role secret to any HTTPS host

**Classification:** BLOCKER  
**File:** `scripts/check-phase2-uat-evidence.mjs:789-851`

**Issue:** The probe validates only that `supabaseUrl` is credential-free HTTPS with `/`, then sends `SUPABASE_SERVICE_ROLE_KEY` as both `apikey` and Bearer authorization. A mistyped, poisoned, or caller-supplied value such as `https://attacker.example` receives the production service-role secret. A local mock confirms that the current function calls `https://attacker.example/rest/v1/rpc/get_phase2_billing_schema_readiness` with both secret-bearing headers. This violates D-24 and the runbook's secure-environment boundary.

**Fix:** Pin the expected production Supabase origin/project reference independently of the probed input and compare `URL.origin` exactly before constructing secret-bearing headers. If self-hosting must be supported, require an explicit trusted-origin allowlist. Add a negative test proving the fetch implementation is never called for a different host, subdomain-confusion host, path, port, or redirect-capable origin; also reject redirects or use `redirect: "error"`.

## Warnings

### WR-01: Retry leaves incident evidence stale and presents enabled no-op Retry controls

**Classification:** WARNING  
**File:** `apps/web/src/components/admin-billing-events.tsx:468-535`

**Issue:** On successful Retry, the component updates only status, processed time, error, and lease start. It does not update the incremented attempt count or last-attempt time required by D-20 and the UI contract, so the row immediately reports stale operational evidence. In addition, the global `retryingId` guard rejects every second Retry while only the active record's button is disabled; other records look enabled but clicks silently do nothing. The component tests are static-render tests and never exercise this state transition.

**Fix:** Return/map the complete settled billing-event snapshot (including `attemptCount` and `lastAttemptedAt`) or refetch the row after settlement. Track pending retries by event ID if independent record retries are allowed; otherwise visibly disable all controls governed by the global lock. Add interaction tests for success, failure, active lease, concurrent records, attempt increments, and focus restoration.

### WR-02: Rejected search input silently becomes an unfiltered ledger query

**Classification:** WARNING  
**Files:** `apps/web/src/app/api/admin/billing-events/route.ts:41-69`, `apps/web/tests/admin-billing-events-route.test.ts:179-187`

**Issue:** `normalizeSearch` returns `null` for email-shaped input or input that sanitizes to empty. `null` is also the "no search requested" state, so the route skips `.or(...)` and returns the full billing ledger. An operator asking for an intentionally rejected identifier therefore receives unrelated results rather than a validation/no-match result. The test asserts only that PostgREST did not receive the email; it does not assert response semantics.

**Fix:** Return a discriminated `invalid | empty | value` result. For `invalid`, return a stable 400 response or an explicit empty/no-match response before querying. Preserve `empty` only for an actually absent/blank query, and test that rejected input cannot return the unfiltered dataset.

### WR-03: Deployment URL validation checks a path suffix instead of the hostname

**Classification:** WARNING  
**File:** `scripts/check-phase2-uat-evidence.mjs:895-960`

**Issue:** After URL normalization, the validator uses `deploymentUrl.endsWith(".vercel.app")`. Because the normalized string may contain a path, `https://attacker.example/foo.vercel.app` passes as a Vercel deployment URL; the current parser accepts that exact example. This weakens the exact deployment-identity gate described by D-22/D-25 and the runbook.

**Fix:** Preserve the parsed `URL` and validate the hostname and path separately:

```js
const deployment = new URL(rawDeploymentUrl);
if (
  deployment.protocol !== "https:" ||
  !/^[a-z0-9-]+\.vercel\.app$/i.test(deployment.hostname) ||
  (deployment.pathname !== "/" && deployment.pathname !== "")
) {
  throw new Error("deployment URL must be a root Vercel HTTPS URL");
}
```

Add hostile-host, deceptive-path, port, username, and subdomain-confusion cases.

---

_Reviewed: 2026-07-26T20:33:36Z_  
_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: deep_
