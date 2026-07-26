# Phase 2: Billing and Fulfillment UAT - Research

**Researched:** 2026-07-26  
**Requirements:** BILL-01, BILL-02, BILL-03, BILL-04, BILL-05  
**Question:** What must be known to plan provider-backed Stripe billing and fulfillment without weakening Soji's receipt, entitlement, or privacy boundaries?

## Executive Summary

Soji already implements most of the Phase 2 system:

- exact server-side membership and product Price validation
- authenticated, rate-limited, idempotent Checkout
- single-user subscription Checkout claims and Stripe Customer reuse
- signature verification followed by durable minimized receipts
- token-owned processing leases, Retry, and reconciliation
- atomic subscription/product entitlement RPCs
- Customer Portal, Account subscription/purchase history, Admin billing search
- private product assets and short-lived owner-only download URLs
- product partial/full refunds and dispute pause/win/loss behavior

The material application gap is membership charge adjustment handling:

1. `charge.dispute.*` resolves only product PaymentIntents. A subscription
   dispute has no `productId`, so the processor returns
   `dispute_not_product_checkout` and leaves membership access unchanged.
2. Every `charge.refunded` event is sent to `sync_stripe_product_refund`.
   A subscription refund therefore becomes a failed billing receipt instead of
   an explicit membership outcome.
3. Subscription state sync recomputes entitlements from status alone. Even if
   a dispute block were added outside that RPC, a later `active` subscription
   refresh could restore access incorrectly.

Phase 2 should add one normalized membership-adjustment model, connect a
disputed/refunded PaymentIntent to its subscription through Stripe's Basil
Invoice Payment API, and make the subscription RPC's entitlement recomputation
consult both subscription status and blocking adjustment state. The rest of the
phase is UI truthfulness, a reproducible secret-free UAT artifact, and real
Stripe test-mode observations.

## Current Implementation Findings

### Foundations to preserve

- `validateStripeMembershipCatalog` enforces one active USD monthly Price with
  interval count one and exact amount per plan lookup key.
- `claim_subscription_checkout` serializes one membership intent per user and
  blocks a second open membership.
- Checkout reuses `getExistingStripeCustomerId`; provider lookup failure stops
  rather than fragments Customer history.
- Checkout Sessions use an opaque UUID intent in an idempotency key and carry
  `userId`, `planId`, and `lookupKey` as server-owned metadata.
- `/api/webhooks/stripe` verifies the Stripe signature before inserting a
  minimized `billing_events` receipt.
- `begin_billing_event_attempt` and `finish_billing_event_attempt` enforce a
  120-second lease and token ownership.
- Webhook Retry retrieves the authoritative Stripe Event; Admin reconciliation
  validates `sub_...` or `cus_...` evidence and reuses subscription sync.
- `sync_stripe_subscription_state` atomically updates the local subscription,
  sourced entitlements, and effective profile tier.
- Product purchase/refund/dispute RPCs use provider IDs, observation ordering,
  terminal-state protection, and derived entitlements.
- Account verifies Checkout Session ownership/mode/payment server-side and
  reads subscriptions/purchases through user-scoped Supabase access.
- Customer Portal binds the authenticated internal subscription UUID before
  using its Stripe Customer ID.
- Private downloads re-check purchase/dispute/asset state and return a
  one-minute signed attachment URL.

### Gap 1: subscription disputes are ignored

`syncProductDispute` retrieves the PaymentIntent and accepts it only when both
`metadata.userId` and `metadata.productId` are UUIDs. Subscription PaymentIntents
do not use `productId`, so the handler records an ignored receipt while the
subscription remains eligible.

The existing product-specific RPC must remain product-specific. Phase 2 needs a
dispatcher that first classifies the PaymentIntent as:

- product Checkout, using its trusted `productId` metadata; or
- subscription invoice payment, using Stripe Invoice Payment mapping.

Unknown/unmapped payments should be intentionally ignored with a stable reason,
not guessed from email, amount, Customer, or the newest local subscription.

### Gap 2: subscription refunds fail product lookup

`charge.refunded` always calls `syncProductRefund`. For a subscription invoice
PaymentIntent, the product purchase RPC cannot find a matching purchase. The
receipt becomes `failed`, which is durable and recoverable but semantically
wrong.

The same payment classifier should route:

- product refund → `sync_stripe_product_refund`
- subscription refund → membership adjustment sync
- unrecognized payment → explicit ignored outcome

Partial membership refund preserves access. A full refund creates a blocking
adjustment for that subscription. The block remains until a later verified paid
invoice for the same subscription is observed or an explicit reconciliation
recomputes from authoritative Stripe data.

### Gap 3: subscription status alone owns access

`sync_stripe_subscription_state` closes sourced entitlements, then recreates
them for `active` or `trialing`. A dispute/refund field updated by a separate
write would therefore be insufficient: any later subscription event could
regrant access.

Entitlement recomputation must occur in a shared service-role-only database
function that evaluates:

- authoritative stored subscription status
- current blocking membership adjustment state
- observation ordering and terminal-state rules

Both subscription state sync and adjustment sync must call this function while
holding the subscription and user advisory locks. No application-layer
multi-write sequence should update subscriptions and entitlements separately.

## Stripe 18.5 / Basil Mapping

The repository pins Stripe `18.5.0`, whose generated types match the Basil-era
Invoice Payment model.

### Supported trace

1. Resolve `dispute.payment_intent`; if missing, retrieve the disputed Charge
   and read its PaymentIntent.
2. Call:
   `stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: paymentIntentId }, limit: 2 })`.
3. Require exactly one relevant Invoice Payment. A missing or ambiguous mapping
   fails processing rather than attaching the adjustment to the wrong member.
4. Resolve `invoicePayment.invoice`; retrieve the Invoice when it is not
   expanded.
5. Require `invoice.parent?.type === "subscription_details"`.
6. Read the subscription from
   `invoice.parent.subscription_details.subscription`.
7. Retrieve the current Stripe Subscription and validate its Soji
   `userId`/`planId` metadata before database synchronization.

This mapping is preferable to PaymentIntent metadata inheritance. Stripe
documents the Invoice Payment resource as the mapping between payment objects
and invoices, and the Invoice parent contains the generating subscription plus
an immutable snapshot of subscription metadata.

### Current Stripe behavior relevant to policy

- `active` and `trialing` are the provisioned statuses.
- `past_due` means the latest finalized invoice failed or was not attempted;
  retry behavior is provider configuration. Soji's locked conservative policy
  does not retain paid access in this state.
- `unpaid`, `paused`, `incomplete`, `incomplete_expired`, and `canceled` do not
  provision access.
- Pausing payment collection is not the same as a paused subscription and does
  not change subscription status. It is not an access-control signal.
- Customer Portal is the existing customer boundary for payment-method and
  cancellation operations.
- Stripe test mode provides deterministic disputed payments and
  `winning_evidence` / `losing_evidence` transitions.

Official references:

- https://docs.stripe.com/billing/subscriptions/overview
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/billing/subscriptions/cancel
- https://docs.stripe.com/api/invoice-payment
- https://docs.stripe.com/api/invoices/object
- https://docs.stripe.com/api/disputes/object
- https://docs.stripe.com/testing

## Recommended Data and Processing Architecture

### Normalized adjustment table

Prefer a dedicated append-addressable/current-state table over adding one
mutable dispute tuple to `subscriptions`:

`subscription_billing_adjustments`

- `id uuid primary key`
- `subscription_id uuid references subscriptions(id)`
- `provider text/billing_provider`
- `provider_payment_id text`
- `provider_adjustment_id text`
- `kind text` constrained to `refund | dispute`
- `status text` constrained to the supported refund/dispute contract
- `amount integer null`
- `currency text null`
- `blocks_access boolean`
- `observed_at timestamptz`
- `created_at`, `updated_at`
- unique provider/kind/adjustment identity

A narrow current-state table remains queryable and supports multiple invoice
payments or disputes over one subscription. It must not store a full Stripe
event or customer data.

### Ordering rules

- Dispute ordering mirrors the product state machine:
  open/warning review < won/warning closed/prevented < lost.
- Same dispute ID and newer provider observation may advance state.
- A terminal loss cannot be overwritten by an older open/won observation.
- Different dispute IDs are ordered by provider observation time, then stable
  provider ID as the deterministic tie-breaker.
- Partial refund does not block.
- Full refund blocks the affected subscription until a later verified paid
  invoice or explicit reconciliation closes/supersedes the block.
- Subscription events never delete adjustment history.

### Shared entitlement recomputation

Create one internal SQL helper and invoke it from:

- `sync_stripe_subscription_state`
- `sync_stripe_subscription_adjustment`
- any later paid-invoice reconciliation path

The helper should close all entitlements sourced by that subscription and
recreate plan entitlements only when the stored subscription is
`active/trialing` and no current adjustment blocks access. It then recomputes
`profiles.tier` across all eligible subscriptions, preserving the existing
highest-tier rule.

### Event processor changes

- Factor PaymentIntent resolution and Invoice Payment classification into
  typed helpers.
- Keep product metadata fast-path behavior.
- For subscription adjustments, retrieve the current Subscription and validate
  the trusted Soji metadata before the RPC.
- Handle the current dispute event set and `charge.refunded`.
- Continue returning explicit `ignored` results for non-Soji events.
- Reuse the existing receipt lease, Retry, stable public errors, and structured
  logging; do not add a second processing path.

## Customer and Admin UI Implications

### Account

Subscriptions need a customer-safe adjustment summary in addition to provider
status:

- normal: plan, Active/Trial, period date, Manage billing
- payment state problem: Payment issue/Paused/Unpaid with conservative access
- open dispute: `Payment disputed` and `Access paused`
- dispute won/closed warning: restored state only when subscription is eligible
- dispute lost: `Dispute lost` and `Access ended`
- full refund: `Payment refunded` and `Access ended`
- partial refund: `Partially refunded` without claiming access ended

The primary action remains `Manage billing`. UI copy should not promise that
opening Portal itself restores access; provider events and local sync remain
authoritative.

### Admin Billing Events

Preserve the incident-ledger hierarchy:

1. receipt status
2. processing outcome
3. event/object reference
4. received, attempt, and processed timestamps
5. attempt count and stable error
6. supported Retry/reconciliation action

Membership adjustment events should be searchable by event/dispute/payment/
subscription identifiers without storing full provider payloads.

## Threat Model Inputs

| Threat | Required mitigation |
|---|---|
| Dispute attached to wrong member | Require exact Invoice Payment mapping and trusted Subscription metadata; fail ambiguous/missing mappings |
| Active subscription refresh regrants disputed access | Shared database entitlement recomputation consults adjustment block |
| Old event reverses terminal outcome | Observation ordering, status rank, stable tie-breaker, database locks |
| Duplicate webhook races Retry | Existing token-owned processing lease and idempotent adjustment identity |
| Browser success grants access | Account remains read-only reflection; webhook/RPC state is authority |
| Full provider payload leaks customer data | Keep minimized receipt and normalized adjustment fields only |
| Refund for unrelated Stripe payment fails repeatedly | Explicit classification and ignored outcome for non-Soji payments |
| Provider-side automatic cancellation is irreversible | Do not mutate pause/resume/cancel from dispute webhook |
| Schema exists locally but not remotely | Forward migration, schema parity, pgTAP, and blocking production push/UAT |

## Planning Recommendations

### Plan A: Membership adjustment state machine

- forward Supabase migration and declarative schema
- normalized adjustment state and privileges/RLS
- shared subscription entitlement recomputation
- membership dispute/full-refund/partial-refund ordering tests
- generated Supabase TypeScript types

This plan is repository-autonomous. Production push remains a later explicit
checkpoint when service-role authorization is available.

### Plan B: Stripe classification and processing

- PaymentIntent → Invoice Payment → Invoice → Subscription resolver
- product/subscription refund and dispute dispatch
- stable ignored/failure outcomes
- Retry and reconciliation compatibility
- route and processor tests

This plan is repository-autonomous with mocked Stripe and Supabase contracts.

### Plan C: Account/Admin truth and Phase 2 evidence

- subscription adjustment reads and customer labels
- responsive Account/Admin billing states
- secret-safe Phase 2 evidence validator and operator runbook
- browser/accessibility and evidence regression tests

This plan is repository-autonomous.

### Plan D: Provider-backed Stripe test UAT

- exact three-Price catalog and Portal configuration
- one test subscription per tier and single-Customer reuse
- signed receipts, failed/ignored recovery, Retry, reconciliation
- product payment/download/unauthorized denial
- partial/full refund and product/membership dispute transitions

This plan depends on explicit authorization for Stripe and Supabase server
secrets plus test-user actions. It must remain `human_needed` or blocked rather
than fabricating provider observations.

## Validation Architecture

### Automated layers

| Layer | Scope | Command |
|---|---|---|
| Focused billing unit/route | catalog, Checkout, Portal, receipt, processing, adjustment classifier, Account/Admin labels | `corepack pnpm --filter @soji/web exec vitest run tests/stripe-price-validation.test.ts tests/checkout-routes.test.ts tests/stripe-customer.test.ts tests/billing-portal-route.test.ts tests/stripe-webhook-sync.test.ts tests/stripe-webhook-route.test.ts tests/stripe-reconciliation.test.ts tests/account-subscriptions.test.ts tests/account-purchases.test.ts tests/admin-billing-events-route.test.ts` |
| Full Web | all unit/component/route regressions | `corepack pnpm --filter @soji/web test` |
| Database | subscription state, adjustments, entitlement/RLS/grants, billing leases | `corepack pnpm test:db` |
| Schema | migrations, lint, declarative parity, generated types | `corepack pnpm db:reset && corepack pnpm db:lint && corepack pnpm db:schema:check && corepack pnpm db:types:check` |
| Static | strict TypeScript and ESLint | `corepack pnpm --filter @soji/web typecheck && corepack pnpm --filter @soji/web lint` |
| Browser | pricing/Account/Admin billing states at desktop/mobile and axe | `corepack pnpm --filter @soji/web test:e2e -- --grep "pricing|account|billing|product|accessibility"` |
| Production artifact | Next build and secret-free standalone artifact | `corepack pnpm --filter @soji/web build && corepack pnpm deploy:check` |
| Evidence | Phase 2 row/safety/ready validator | `corepack pnpm phase2:uat:check && corepack pnpm test:uat` |

### Sampling cadence

- After each schema task: focused pgTAP adjustment tests plus schema lint.
- After each processor task: focused Stripe Vitest set.
- After each Account/Admin task: focused component/route tests.
- After every plan: typecheck, lint, and the plan's focused tests.
- After the autonomous wave: full Web, database, schema, build, deploy artifact,
  and browser suites.
- Before closeout: provider-backed UAT rows plus strict ready validator.

### Wave 0 additions

- Create pgTAP coverage for the new adjustment table/RPC before implementation.
- Create Stripe resolver/dispatcher fixtures for product, subscription, missing,
  and ambiguous Invoice Payment mappings.
- Create Account/Admin fixtures for open/won/lost/full/partial states.
- Create the Phase 2 evidence parser tests before the artifact is promoted.

### Manual/provider-only assertions

- Stripe test catalog/lookup keys and Customer Portal configuration
- signed webhook delivery from Stripe to the canonical deployment
- real test Checkout and Customer continuity
- Portal cancellation round trip
- deterministic test refunds and dispute evidence transitions
- canonical Account/Admin observations after provider processing

Automated contracts must not promote those rows to `PASS`.

## Risks and Avoidances

- Do not infer a subscription from Customer email, amount, or newest local row.
- Do not store a full Stripe Event in the adjustment table or evidence file.
- Do not make the webhook automatically cancel or pause Stripe billing.
- Do not edit deployed migrations; use a forward migration and regenerate types.
- Do not let a provider callback or Checkout return query grant access.
- Do not treat an ignored subscription dispute/refund as acceptable completion.
- Do not mark BILL requirements complete from mocks alone.
- Do not upload Stripe or Supabase server secrets without explicit owner approval.

## RESEARCH COMPLETE

Phase 2 can be implemented as three autonomous repository plans plus one
provider-backed UAT checkpoint. The main engineering addition is a normalized
membership adjustment state machine joined to the existing atomic subscription
entitlement recomputation through Stripe's Invoice Payment mapping.
