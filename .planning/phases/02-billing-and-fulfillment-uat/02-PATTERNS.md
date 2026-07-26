# Phase 02: Billing and Fulfillment UAT - Pattern Map

**Mapped:** 2026-07-26  
**Inputs:** `02-CONTEXT.md`, `02-RESEARCH.md`, `02-UI-SPEC.md`, `02-VALIDATION.md`  
**Files/responsibilities classified:** 26  
**Internal analog coverage:** 24 / 26

## File Classification

`<next>` means a new immutable forward-migration timestamp chosen at execution time. Do not rename or edit an existing migration.

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/<next>_subscription_billing_adjustments.sql` | migration/model | event-driven CRUD | `20260715070000_sync_product_disputes.sql` + `20260715050000_order_stripe_state_events.sql` | exact structure, different policy |
| `supabase/schema.sql` | declarative schema/model | event-driven CRUD | current subscription and product sync blocks at lines 81-103, 316-365, 1724-2220 | exact |
| `supabase/tests/database_access.sql` | pgTAP test | event-driven CRUD | subscription tests at 1175-1323; refund/dispute tests at 1630-1934 | exact |
| `apps/web/src/lib/supabase/database.types.ts` | generated model | transform | `scripts/sync-supabase-types.mjs` | exact |
| `apps/web/src/lib/stripe-webhook.ts` | service/dispatcher | event-driven | current product refund/dispute dispatch at lines 216-376 | exact |
| `apps/web/src/lib/stripe-reconciliation.ts` | service | request-response | current subscription/customer reconciliation at lines 37-80 | exact |
| `apps/web/tests/stripe-webhook-sync.test.ts` | unit test | event-driven | current refund/dispute fixtures at lines 450-641 | exact |
| `apps/web/tests/stripe-webhook-route.test.ts` | route test | event-driven request-response | current receipt-first tests at lines 94-245 | exact |
| `apps/web/tests/stripe-reconciliation.test.ts` | unit test | request-response | current ID classification/current-state tests at lines 42-113 | exact |
| `apps/web/src/lib/account-subscriptions.ts` | query service/model mapper | CRUD/request-response | current subscription query at lines 48-120 | exact |
| `apps/web/src/lib/subscription-billing-state.ts` (recommended new helper) | utility | transform | `apps/web/src/lib/purchase-status.ts` | role/data-flow match |
| `apps/web/src/app/account/page.tsx` | server component | request-response | current purchase and subscription records at lines 285-479 | exact |
| `apps/web/src/app/account/loading.tsx` | route loading UI | request-response/loading | No internal route-loading file; follow `02-UI-SPEC.md` “Account initial loading” contract | contract-only |
| `apps/web/tests/account-subscriptions.test.ts` | unit test | CRUD/transform | current mapping/error tests at lines 25-124 | exact |
| `apps/web/tests/account-billing-readiness-page.test.tsx` | component test | request-response | current product reversal/page tests at lines 110-241 | exact |
| `packages/types/src/index.ts` | shared model | transform | `BillingEventLog` at lines 171-193 | exact |
| `apps/web/src/lib/billing.ts` | query service/model mapper | CRUD/request-response | current `billingEventSelect`/mapper at lines 26-58 | exact |
| `apps/web/src/app/api/admin/billing-events/route.ts` | admin route | CRUD/request-response | current bounded filter/query at lines 9-108 | exact |
| `apps/web/src/components/admin-billing-events.tsx` | client component | event-driven request-response | current search/Retry/reconcile ledger | exact |
| `apps/web/tests/admin-billing-events-route.test.ts` | route test | CRUD/request-response | current auth/search/error tests at lines 74-171 | exact |
| `apps/web/tests/admin-billing-events-component.test.tsx` | component test | transform | current receipt-vs-processing assertion at lines 6-39 | exact |
| `scripts/check-phase2-uat-evidence.mjs` | validator utility | file-I/O/batch | `scripts/check-phase1-uat-evidence.mjs` | exact |
| `scripts/check-phase2-uat-evidence.test.mjs` | Node test | file-I/O/batch | `scripts/check-phase1-uat-evidence.test.mjs` | exact |
| `.planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md` | evidence record | file-I/O | Phase 1 evidence artifact | exact |
| `docs/phase-2-billing-and-fulfillment-uat.md` | operator runbook | batch/manual event flow | `docs/phase-1-production-identity-uat.md` | exact |
| `package.json` | config | batch | Phase 1 UAT scripts at lines 20-25 | exact |

If the executor keeps subscription-state mapping inside `account-subscriptions.ts`, omit the recommended new helper and apply its pattern there. The UI contract permits extraction but does not require extra components.

## Pattern Assignments

### SQL state machine: migration, schema, pgTAP

**Targets:** the forward migration, `supabase/schema.sql`, `supabase/tests/database_access.sql`

**Primary analog:** `supabase/migrations/20260715070000_sync_product_disputes.sql`

Copy the complete-state constraint shape (lines 1-26), input validation/advisory lock shape (148-205), observation ordering structure (211-247), entitlement recomputation call site (249-289), and service-role-only grant pattern (293-298):

```sql
perform pg_advisory_xact_lock(
  hashtextextended('soji.stripe-payment:' || p_provider_payment_id, 0)
);

if current_observed_at is not null and (
  p_observed_at < current_observed_at
  or (p_observed_at = current_observed_at and ...)
) then
  return current_dispute_status;
end if;

revoke all on function public.sync_stripe_product_dispute(
  text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_stripe_product_dispute(
  text, text, text, timestamptz
) to service_role;
```

**Subscription RPC analog:** `supabase/migrations/20260715050000_order_stripe_state_events.sql` lines 13-159.

The existing RPC already supplies the lock order, ownership check, observation guard, sourced-entitlement close/recreate, and highest-tier recomputation:

```sql
perform pg_advisory_xact_lock(
  hashtextextended('soji.stripe-subscription:' || p_provider_subscription_id, 0)
);
perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

update public.user_entitlements
set ends_at = effective_observed_at
where user_id = p_user_id
  and source_type = 'subscription'
  and source_id = p_provider_subscription_id;

if effective_status in ('active', 'trialing') then
  -- recreate plan-sourced entitlements
end if;
```

Extract that entitlement block into one internal SQL helper that both `sync_stripe_subscription_state` and the new `sync_stripe_subscription_adjustment` call while the same subscription/user locks are held. The helper must decide eligibility from stored subscription state **and** current blocking adjustments, then recompute `profiles.tier` with the same eligibility predicate.

**Table shape:** follow `billing_events` (`supabase/schema.sql` lines 105-135) for provider identity and uniqueness, but use the normalized fields from research: subscription FK, provider payment ID, provider adjustment ID, `refund|dispute`, status, amount/currency, `blocks_access`, `observed_at`, timestamps, and a unique provider/kind/adjustment identity. Add:

- authenticated owner/admin `SELECT` RLS matching `subscriptions_select_own_or_admin` (schema lines 2632-2635);
- no authenticated insert/update/delete grant;
- explicit service-role privileges/readiness coverage;
- explicit authenticated `SELECT` in the declarative grant list (schema lines 2457-2473).

**pgTAP analogs:**

- privileges: `database_access.sql` lines 656-703;
- subscription atomicity/terminal ordering: lines 1175-1323;
- partial/full refund outcomes: lines 1630-1753;
- dispute pause/order/restore: lines 1757-1934.

Use `select is`, `select ok`, `throws_like`, JWT `set_config`, and direct entitlement/profile assertions. Cover multiple adjustment IDs, equal-time ID tie-breaks, duplicate replay, older replay, open/won/lost, partial/full refund, later active subscription refresh, paid-invoice/reconciliation unblock, RLS, and grants.

### Generated Supabase types

**Target:** `apps/web/src/lib/supabase/database.types.ts`

**Analog:** `scripts/sync-supabase-types.mjs` lines 18-67.

```js
"db:types": "node scripts/sync-supabase-types.mjs --write",
"db:types:check": "node scripts/sync-supabase-types.mjs --check"
```

The generator runs `supabase gen types --local --schema public` and replaces the target (script lines 18-52). Never hand-edit the generated file. Reset/apply the migration first, run `corepack pnpm db:types`, then `db:types:check`. The generated result must contain the adjustment table relationship and the exact new RPC arguments/return type beside the existing `sync_stripe_*` functions (`database.types.ts` lines 915-955).

### Stripe PaymentIntent classification and adjustment dispatch

**Targets:** `stripe-webhook.ts`, `stripe-reconciliation.ts`, their three focused tests

**Analog:** `stripe-webhook.ts` lines 181-300 and 302-376.

Preserve the product metadata fast path and service-role RPC boundary:

```ts
const userId = paymentIntent.metadata.userId;
const productId = paymentIntent.metadata.productId;

if (isUuid(userId) && isUuid(productId)) {
  return supabase.rpc("sync_stripe_product_dispute", {
    p_observed_at: observedAt,
    p_provider_dispute_id: dispute.id,
    p_provider_payment_id: paymentId,
    p_status: dispute.status
  });
}
```

Replace the current non-product `ignored` exit (lines 270-278) with a typed classifier:

```text
resolve PaymentIntent (Dispute may require Charge retrieval)
  -> valid product userId + productId metadata: product RPC
  -> otherwise Invoice Payment list(limit: 2)
  -> exactly one Invoice
  -> parent.type === subscription_details
  -> retrieve current Subscription
  -> validate current userId/planId metadata
  -> subscription-adjustment RPC
```

The pinned SDK contract is local and exact:

```ts
stripe.invoicePayments.list({
  payment: { type: "payment_intent", payment_intent: paymentIntentId },
  limit: 2
});
```

`stripe@18.5.0` declares this at `InvoicePaymentsResource.d.ts` lines 12-44 and returns `ApiListPromise<Stripe.InvoicePayment>` at lines 50-71. `InvoicePayment.invoice` is `string | Invoice | DeletedInvoice` (`InvoicePayments.d.ts` lines 46-50). `invoice.parent` may be null; the subscription path is `parent.type === "subscription_details"` then `parent.subscription_details.subscription` (`Invoices.d.ts` lines 1018-1053). Fail closed for deleted/missing invoices, null/wrong parent, missing subscription details, and non-unique mappings.

Keep current Subscription metadata validation/RPC style (`stripe-webhook.ts` lines 82-134):

```ts
if (!isUuid(userId) || !planId || !getPlanByTier(planId)) {
  throw new Error("stripe_subscription_metadata_missing");
}

const { data, error } = await supabase.rpc(
  "sync_stripe_subscription_state",
  { /* named p_* args */ }
);
if (error) throw new Error(error.message);
```

Route `charge.refunded` through the same classifier rather than unconditionally calling `sync_stripe_product_refund` (current lines 216-245, 348-350). Partial/full comes from `amount_refunded` versus `amount`; send amount and currency to the membership RPC. Route all five current dispute event types through the classifier (lines 352-360).

`stripe-reconciliation.ts` lines 37-80 is the authoritative refresh analog: validate only `sub_`/`cus_`, retrieve/list current Stripe subscriptions, and reuse the same sync function. Extend this path only as needed to re-evaluate full-refund blocks from authoritative payment evidence; do not introduce direct database writes.

**Test shape:** extend `stripe-webhook-sync.test.ts` table-driven refund tests (450-485), dispute Charge fallback (539-575), and the current subscription-dispute gap fixture (577-604). Add product, subscription, missing, deleted, wrong-parent, and ambiguous Invoice Payment fixtures; assert exact Stripe calls, exact RPC name/args, stable ignored reasons, and fail-before-RPC behavior. Keep `stripe-webhook-route.test.ts` receipt-first ordering assertions (94-127) and failed-but-received response (177-208). Retry must continue retrieving the original Stripe Event (`retry/route.ts` lines 104-118).

### Account adjustment query and customer state mapping

**Targets:** `account-subscriptions.ts`, recommended `subscription-billing-state.ts`, `account/page.tsx`, two Account tests

**Query analog:** `account-subscriptions.ts` lines 48-120.

```ts
type SubscriptionRow = Pick<Tables<"subscriptions">, /* selected columns */>;

const { data, error } = await supabase
  .from("subscriptions")
  .select("...")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

if (error || !data) {
  await reportOperationalError("account.subscriptions_query_failed", error, { userId });
  return { error: "subscription_query_failed", items: [] };
}
```

Select nested adjustment rows through the subscription relationship, map provider fields to a small customer-safe adjustment summary, and preserve the stable error boundary. Do not expose dispute/payment/subscription IDs.

**Pure mapping analog:** `purchase-status.ts` lines 1-33.

Create a typed pure function returning:

```ts
type SubscriptionBillingPresentation = {
  accessLabel: string;
  detail: string | null;
  primaryLabel: string;
  tone: "success" | "warning" | "neutral" | "error";
};
```

Apply the UI-spec priority exactly: lost dispute, open dispute/inquiry, current full refund, current partial refund, then underlying status/cancellation. Unknown states return `Status unavailable` / `Access unavailable`; never `replaceAll("_", " ")`.

**Page analog:** the current subscription record at `account/page.tsx` lines 322-359 and product reversal rendering at 418-471. Keep border-separated `article` rows, semantic `<time>`, and one Portal action. The current `formatSubscriptionStatus` (119-134) is the code to replace, not copy.

Tests should copy `account-subscriptions.test.ts` lines 78-123 for typed row mapping/stable errors and `account-billing-readiness-page.test.tsx` lines 140-241 for server-rendered reversal states. Add all UI-spec membership combinations, especially won plus ineligible subscription, partial refund plus ineligible subscription, full refund outranking resolved dispute, and unknown state.

### Admin billing-event references, search, and incident ledger

**Targets:** `packages/types/src/index.ts`, `billing.ts`, Admin route/component, route/component tests

**Model/mapper analog:** `billing.ts` lines 26-58 and `packages/types/src/index.ts` lines 171-193. Add only bounded receipt reference fields needed by Admin (object type/ID and related payment/subscription/customer references); parse `Json` defensively as `stripe-reconciliation.ts` does at lines 22-35.

**Search analog:** Admin route lines 41-53 and 67-97.

```ts
const safeValue = value?.trim().slice(0, 200)
  .replace(/[^A-Za-z0-9._:-]+/g, "");

if (search) {
  query = query.or(
    `provider_event_id.ilike.%${search}%,event_type.ilike.%${search}%`
  );
}
```

Extend the bounded search to stored dispute/payment/subscription/customer references without email or full payload search. Keep auth before query, page/limit clamps, exact count, deterministic `created_at DESC, id DESC`, structured internal logging, and stable `billing_events_query_failed`.

**Ledger analog:** `admin-billing-events.tsx` lines 403-481. Preserve the separate `Received and stored` evidence and processing state, attempts, timestamps, stable error, and eligibility-gated Retry. Restructure to the UI contract's two explicit badges (`Receipt · Received`, `Processing · …`), four-column evidence order, object reference, semantic `<time>`, one shared live region, and mobile stacking. Retain current bounded async functions for Search (85-150), Retry (152-210), and Reconcile (212-278).

The component test at lines 6-39 already asserts receipt/process separation. Expand it with each lease/outcome, two badges, references, Retry visibility, and privacy assertions. Extend route tests at lines 87-132 for reference search and filter-grammar removal.

### Phase 2 evidence validator, artifact, runbook, scripts

**Targets:** Phase 2 validator/test/evidence/runbook and root `package.json`

**Exact analog:** `scripts/check-phase1-uat-evidence.mjs`.

Copy:

- exported fixed scenario list/status list (lines 5-20);
- table-row parser (50-68);
- missing/duplicate/unknown/status validation (70-97);
- secret scan (99-103);
- all-PASS ready gate (105-113);
- import-safe CLI entry point (123-156).

The Node tests at lines 9-88 provide the fixture builder and one-test-per-contract style. Add `phase2:uat:check`, `phase2:uat:ready`, and include both validator suites in `test:uat`, following `package.json` lines 20-25.

The evidence table follows Phase 1 (`01-UAT-EVIDENCE.md` lines 6-18): fixed scenario ID, status, UTC date, canonical environment, redacted subject, expected, observed, notes. Phase 2 adds bounded Stripe object type/last suffix where useful. The runbook follows `docs/phase-1-production-identity-uat.md`: safety rules first, commands, prerequisites, one exact scenario section at a time, expected result, recovery, closeout.

## Shared Patterns

### Receipt before processing

**Source:** `apps/web/src/app/api/webhooks/stripe/route.ts` lines 26-64 and 84-143.

Signature verification precedes `recordStripeBillingEvent`; persistence precedes lease claim/provider classification; business failure returns `received: true`. No Phase 2 resolver call may move before durable receipt.

### Token-owned processing and type-aware Retry

**Source:** `stripe-webhook.ts` lines 421-553 and Admin retry route lines 42-145.

Every attempt uses `begin_billing_event_attempt`; only its claim token can settle. Provider receipts reload `stripe.events.retrieve`; synthetic reconciliation validates its stored `sub_`/`cus_` identifier and refreshes current state.

### Atomic database authority

**Source:** `sync_stripe_subscription_state` and product adjustment RPCs.

Application code makes one RPC call. Ownership checks, observation ordering, adjustment write, entitlement close/recreate, and tier recomputation remain one database transaction under advisory locks.

### Stable, secret-free boundaries

**Sources:** Account query lines 100-105; Admin route lines 89-97; webhook route lines 123-143.

Log provider/database detail only through structured operational logging with bounded IDs. Return stable reasons/copy. Never render `error.message`, raw payloads, email, internal user ID, tokens, or secrets.

## Landmines for the Planner

- Do **not** copy the product dispute rank policy verbatim. Product tests currently permit a later `won` after `lost` (`database_access.sql` lines 1871-1897); Phase 2 membership policy says `lost` remains blocking.
- `sync_stripe_subscription_state` currently checks only status in both entitlement and tier queries. Updating only the adjustment RPC allows a later active refresh to regrant access.
- A full-refund block needs an explicit supersession rule for a later verified paid invoice or authoritative reconciliation; a generic active subscription update is not proof of new payment.
- Receipt payloads are constrained to an exact allowlist (`20260714100000_minimize_stripe_billing_event_payload.sql` lines 36-58). Any new bounded reference key requires one forward migration, declarative-schema parity, pgTAP fixtures, and the minimal-receipt unit test; never store a full Stripe object.
- Current Admin search covers only event ID/type, and current indexes cover chronology/status only. Plan a query/index strategy for bounded reference search; do not bolt unsanitized JSON filter grammar into `.or(...)`.
- `AccountSubscription.canManage` currently checks Customer binding only (line 109), while the UI contract also restricts manageable statuses. The demo fixture is canceled but `canManage: true`; update both logic and fixtures.
- Current Account fallback formats unknown raw enums for customers. Replace it with explicit fail-closed mapping.
- Invoice Payment mappings must be exactly one. Never infer membership from email, amount, Customer alone, or newest local subscription.
- `InvoicePayment.invoice` can be a deleted object and `Invoice.parent` can be null. Narrow every union before reading subscription details.
- Preserve product metadata fast-path behavior and explicit ignored outcomes for clearly non-Soji payments. Missing/ambiguous evidence must never attach an adjustment to a guessed subscription.
- Regenerate Supabase types; do not manually maintain the new table/RPC signatures.
- The Phase 2 evidence validator must reject full provider IDs, card data, emails, keys, webhook secrets, signatures, cookies, tokens, and raw payloads. Only test-mode observations on the canonical deployed Web app can make provider scenarios `PASS`; mocks/contracts cannot.
- Keep the worktree's existing broad changes intact. Execution plans must stage only their named files.

## No Internal Analog

| Responsibility | Reason | Canonical source |
|---|---|---|
| PaymentIntent → Invoice Payment → Invoice parent → Subscription resolver | No existing Soji code uses Invoice Payments | Pinned Stripe 18.5.0 generated types cited above plus `02-RESEARCH.md` |
| `apps/web/src/app/account/loading.tsx` geometry-preserving route loading state | No existing `apps/web/src/app/**/loading.tsx` analog exists; do not infer a spinner or false empty state | `02-UI-SPEC.md` “Account initial loading”: preserve heading/tier/subscription/purchase geometry, render neutral border-led placeholders, announce exactly `Loading account billing…`, and never flash Free/no-access/empty copy |

## Metadata

**Search scope:** `apps/web/src`, `apps/web/tests`, `packages/types`, `supabase/schema.sql`, `supabase/migrations`, `supabase/tests`, `scripts`, `docs`, Phase 1 artifacts  
**Strong analogs read:** subscription state RPC, product refund/dispute state machines, Stripe webhook dispatcher, Account subscription mapper/page, Admin billing ledger/query, Phase 1 evidence validator  
**Pattern extraction date:** 2026-07-26

## PATTERN MAPPING COMPLETE

Planner can split the work into schema/state, Stripe dispatch, Account/Admin truth, and provider-backed evidence plans while referencing the concrete analogs and exceptions above.
