# Phase 2: Billing and Fulfillment UAT - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning
**Mode:** Autonomous recommendations accepted under the owner's instruction for Codex to complete all phases and defer one consolidated human checkpoint

<domain>
## Phase Boundary

This phase proves Soji's Web billing and digital fulfillment loop in Stripe test
mode. It covers the three membership Prices, subscription Checkout, durable
webhook receipt and recovery, Account billing truth, Customer Portal, one-time
product purchase and private download, refunds, and both product and membership
disputes.

The phase may close application, schema, policy, evidence, and UI gaps needed to
make those behaviors deterministic and auditable. It does not accept live
payments, add coupons beyond the existing Checkout option, introduce usage
billing, change the three-tier catalog, integrate RevenueCat, or publish final
legal policy pages. Provider secrets and real test-mode round trips remain an
explicit final authorization/UAT boundary.

</domain>

<decisions>
## Implementation Decisions

### Membership Checkout and Customer Continuity
- **D-01:** The three existing plans remain the only v1 membership choices. Each must resolve by server-owned lookup key to one active monthly USD Price with its exact configured amount.
- **D-02:** Client requests identify only a plan and opaque request intent; the server owns Price resolution, amount validation, return URLs, and Stripe metadata.
- **D-03:** One user may have only one live or in-progress Stripe membership. Ambiguous retries reuse the original claim and Stripe idempotency key instead of opening another Checkout Session.
- **D-04:** Reuse the newest Stripe Customer already bound to the Soji user. A lookup failure stops Checkout rather than creating fragmented Customer history.
- **D-05:** The Account page is the post-Checkout source of truth. Its success state must be verified from Stripe and durable local state; the browser return query alone never grants access.
- **D-06:** Subscription management stays in Stripe Customer Portal, opened from the exact authenticated local subscription. The Portal may update payment methods and cancel, but Soji continues to authorize only from synchronized provider state.

### Membership Payment, Refund, and Dispute Policy
- **D-07:** Membership entitlements exist only while the authoritative subscription is `active` or `trialing` and no current billing adjustment blocks delivery. `incomplete`, `past_due`, `unpaid`, `paused`, `incomplete_expired`, and `canceled` do not retain paid access.
- **D-08:** A membership charge dispute in `warning_needs_response`, `warning_under_review`, `needs_response`, or `under_review` pauses Soji access immediately while preserving the underlying Stripe subscription record for investigation.
- **D-09:** A dispute resolved as `won`, `warning_closed`, or `prevented` removes the dispute block and restores access only if the underlying subscription is otherwise eligible. A `lost` dispute ends access and remains blocking.
- **D-10:** A partial membership refund preserves access for the paid period. A full refund blocks membership delivery for the affected subscription until a later verified successful subscription payment or an explicit provider reconciliation establishes a new paid state.
- **D-11:** Webhook processing does not automatically pause collection, resume, or irreversibly cancel a Stripe subscription. Those provider billing actions remain explicit Customer Portal or Admin/Stripe operations; Soji's internal access response is immediate and auditable.
- **D-12:** Later subscription updates cannot silently erase an unresolved or lost dispute/refund block. Adjustment state changes use provider IDs, observation time, terminal-state ordering, and idempotent database transitions.

### Product Fulfillment and Reversals
- **D-13:** Every active product must have one exact active one-time USD Stripe Price and one private delivery asset before Checkout can be offered.
- **D-14:** A paid or no-payment-required Checkout creates the purchase and derived entitlement atomically. Delayed payment grants nothing until the async success event arrives.
- **D-15:** Partial product refunds retain download access; a full refund revokes it. An open dispute pauses access, a loss keeps it ended, and a win/closed warning restores access only when the purchase is not fully refunded.
- **D-16:** Download authorization is re-evaluated on every request from the immutable purchase owner, purchase/dispute state, and private asset. Successful requests receive only a short-lived signed attachment URL.

### Durable Receipt and Recovery Operations
- **D-17:** A valid Stripe signature is required before receipt. Once verified, the minimized event receipt is stored before business processing so `received`, `processing`, `processed`, `ignored`, and `failed` remain independently queryable.
- **D-18:** Processing claims use the existing database lease and token. Active duplicates receive a retryable outcome; expired work can be reclaimed; stale workers cannot settle a newer attempt.
- **D-19:** Admin Retry reloads authoritative Stripe data rather than persisting a full provider event. Provider events and synthetic reconciliation events retain different validated replay paths.
- **D-20:** Admin UI must distinguish delivery receipt from processing outcome, display attempt and timing evidence, permit bounded search/filtering, and explain when Retry or reconciliation is the supported recovery action.
- **D-21:** All customer and Admin errors remain stable and secret-free. Structured operational logs may include bounded internal/provider identifiers but never raw event payloads, customer email, tokens, or secret values.

### Stripe Test-Mode Acceptance Evidence
- **D-22:** Only Stripe test-mode transactions against the canonical deployed Web app count as provider-backed Phase 2 evidence; no live payment is authorized in this phase.
- **D-23:** Acceptance covers one successful subscription Checkout per tier, single-Customer reuse, Portal access, cancellation synchronization, successful product delivery, unauthorized download denial, partial/full refund, dispute open/win/loss, ignored receipt, forced failed processing, Retry, and reconciliation.
- **D-24:** Evidence records UTC date, canonical environment, redacted subject label, Stripe object-type/ID suffix where useful, expected state, observed state, and outcome. It never stores card numbers, emails, signatures, keys, webhook secrets, cookies, or full Stripe payloads.
- **D-25:** Repository tests and provider configuration checks may prove contracts, but they do not promote real Checkout, signed delivery, Portal, refund, or dispute rows to `PASS` without live test-mode observations.

### the agent's Discretion
- Codex may choose the normalized database shape for membership billing adjustments, provided it supports multiple provider events, deterministic ordering, idempotency, and the policy above.
- Codex may refine Account/Admin hierarchy, labels, responsive density, and component boundaries while preserving Soji's editorial customer UI and operationally dense Admin language.
- Codex may split implementation and UAT into as many plans as needed to keep schema, application behavior, and evidence independently verifiable.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `validateStripeMembershipCatalog` validates lookup key, active state, recurring interval, currency, and amount with the same contract used by readiness and Checkout.
- `claimSubscriptionCheckout`, the checkout rate limiter, Stripe idempotency key, and `getExistingStripeCustomerId` already protect membership initiation and Customer continuity.
- `sync_stripe_subscription_state`, `sync_stripe_product_purchase`, `sync_stripe_product_refund`, and `sync_stripe_product_dispute` own atomic state and entitlement changes.
- `recordStripeBillingEvent`, processing leases, type-aware Retry, and reconciliation already provide the durable receipt/recovery foundation.
- `getAccountSubscriptions`, `getAccountPurchases`, `BillingPortalButton`, and the Account page already expose customer billing state.
- `AdminBillingEvents` already supports receipt search, status filtering, Retry, and subscription/customer reconciliation.
- Product asset validation, the cleanup outbox, RLS, and one-minute signed downloads already protect digital fulfillment.

### Established Patterns
- Billing truth is server/provider/database owned; browser redirects and client amounts are never authority.
- Verified receipts are deliberately separate from processing outcomes.
- Cross-table billing writes happen in service-role-only RPCs under advisory locks and observation ordering.
- Live dependency errors fail closed and never fall back to demo authority.
- Provider payloads are minimized locally; Retry retrieves the current authoritative Stripe object.
- Customer UI uses calm truthful states; Admin uses explicit operational labels and bounded actions.

### Integration Points
- Subscription Checkout: `apps/web/src/app/api/checkout/subscription/route.ts`.
- Product Checkout: `apps/web/src/app/api/checkout/product/route.ts`.
- Webhook processing: `apps/web/src/app/api/webhooks/stripe/route.ts` and `apps/web/src/lib/stripe-webhook.ts`.
- Billing schema/RPCs/RLS: `supabase/schema.sql`, forward migrations, and pgTAP tests.
- Customer truth: `/account`, billing Portal route, purchases, subscriptions, and download route.
- Operator recovery: `/admin` Billing Events routes and components.
- Release gating: `/api/health/ready`, Admin Launch Checklist, Phase 2 runbook, and a secret-safe UAT evidence artifact.

</code_context>

<specifics>
## Specific Ideas

- Follow Stripe's current separation between subscription status, true subscription pause, and `pause_collection`; Soji access is derived from explicit synchronized state rather than assuming that paused collection changes subscription status.
- Use Stripe's Invoice Payment mapping to connect a disputed PaymentIntent to the generating subscription invoice under the repository's pinned Stripe API generation.
- Follow Stripe test-mode dispute guidance for deterministic open, win, and loss scenarios and use Customer Portal for customer-initiated subscription management.
- Keep the Account presentation close to modern subscription products: one current-state label, one next billing/access date, one primary “Manage billing” action, and contextual recovery copy only when action is required.
- Keep Admin Billing Events closer to an incident ledger than an analytics dashboard: receipt state, processing state, object reference, attempts, timestamps, and the supported recovery action should scan in that order.
- Canonical technical references:
  - https://docs.stripe.com/billing/subscriptions/overview
  - https://docs.stripe.com/billing/subscriptions/webhooks
  - https://docs.stripe.com/billing/subscriptions/cancel
  - https://docs.stripe.com/api/invoice-payment
  - https://docs.stripe.com/api/disputes/object
  - https://docs.stripe.com/testing

</specifics>

<deferred>
## Deferred Ideas

- Live-mode charges, final tax configuration, and final legal/refund wording remain launch-owner/legal acceptance work in later phases.
- Automatic provider-side dispute cancellation, automatic dispute evidence submission, fraud scoring, Radar rule design, and billing-event retention duration are intentionally deferred.
- RevenueCat/mobile IAP remains v2.

</deferred>

---

*Phase: 02-billing-and-fulfillment-uat*
*Context gathered: 2026-07-26*
