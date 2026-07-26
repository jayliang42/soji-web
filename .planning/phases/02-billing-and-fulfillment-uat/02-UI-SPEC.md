---
phase: 02
slug: billing-and-fulfillment-uat
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-26
---

# Phase 02 — UI Design Contract

> Visual and interaction contract for Account billing truth, private purchase delivery, and Admin billing-event recovery. Generated under the autonomous Phase 2 defaults and grounded in `02-CONTEXT.md`, `02-RESEARCH.md`, the approved Phase 1 UI contract, the public-surface review, and the current Soji implementation.

---

## Design Intent

Phase 2 has two related but visually distinct responsibilities:

1. **Account is a calm customer record.** It states the current membership, access outcome, important date, purchases, and one safe next action without exposing provider internals. It keeps Soji's restrained editorial product language.
2. **Admin Billing Events is an incident ledger.** It makes durable receipt, processing outcome, identifiers, attempts, timestamps, stable error, and supported recovery action scannable in that order. It retains Soji's operationally dense Admin language.

The browser return from Checkout is an informational banner, never the visual source of access authority. Account rows must reflect synchronized Stripe and durable local state. Admin must never collapse “received and stored” into “processed successfully.”

This phase is an extension of existing surfaces, not a redesign. Do not add dashboards, charts, promotional modules, oversized cards, decorative gradients, or billing controls that mutate Stripe refunds, disputes, collection, or cancellation from Soji.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing Tailwind CSS 3 configuration and `@soji/ui` brand tokens |
| Preset | Not applicable |
| Component library | Existing Soji React components; no new component library |
| Icon library | None required; use text labels and existing CSS shapes only |
| Display font | Georgia, Times New Roman, serif |
| Body font | Inter, Helvetica Neue, sans-serif |
| Mono font | JetBrains Mono, Fira Code, monospace, only for bounded provider/object references |
| Radius | 4px badges, 6px controls, 8px panels |
| Elevation | Border-led surfaces; no new shadows |

`components.json` is absent. The project is Next.js/React, but the owner has explicitly required no new component library, so the shadcn initialization gate resolves to **no initialization**. No shadcn, Radix, Base UI, remote registry, or copied registry block may be introduced.

### Existing components to preserve

| Component/pattern | Contract |
|-------------------|----------|
| `SectionShell` | Retain the `max-w-6xl` product shell, editorial heading family, 24px horizontal gutter, single page `h1`, and inherited 80px desktop vertical padding unchanged. |
| `DataUnavailable` | Reuse for server/query failures; errors are visible, stable, and secret-free. |
| `BillingPortalButton` | Remains the only customer subscription-management action in Soji. |
| `AdminBillingEvents` | Extend in place; retain search, processing filter, pagination, Retry, and reconciliation. |
| Border-separated records | Continue for subscription, purchase, and billing-event collections; do not turn them into floating marketing cards. |

### Phase component boundaries

The executor may extract the following local components when it makes state mapping testable, but must not introduce a package or registry dependency:

| Component | Responsibility |
|-----------|----------------|
| `AccountSubscriptionRow` | Plan name, one primary billing label, one access label, date, adjustment explanation, and Portal action |
| `AccountPurchaseRow` | Product title, payment/dispute label, delivery/access label, purchase date, and `Download file` action |
| `BillingStateLabel` | Customer-safe label and semantic style from a typed state; never renders a raw enum |
| `BillingEventRecord` | Receipt state, processing state, references, attempt/timing evidence, stable error, and recovery action |
| `BillingActionMessage` | One shared polite live region for Admin search, Retry, and reconciliation outcomes |

---

## Layout Contract

### Account page shell

- Keep `/account` inside the existing `SectionShell`: `max-w-6xl`, 24px horizontal padding, and its inherited 80px desktop vertical padding. The 80px value is existing shell geometry, remains unchanged, and is not a Phase 2 spacing token.
- Preserve the current editorial account overview before billing history. The billing sections follow in this order:
  1. current tier and active entitlements
  2. Checkout return banner, when present
  3. Membership billing
  4. optional membership plan comparison
  5. Standalone purchases
- `Membership billing` and `Standalone purchases` are sibling `h2` sections separated by a 1px `#c8ccc5` top rule and 24px top padding.
- Each record is border-separated rather than enclosed in an individual elevated card.
- Customer-facing copy must never show provider event IDs, dispute IDs, PaymentIntent IDs, subscription IDs, lookup keys, database enums, or raw ISO timestamps.

### Account record layout — desktop (`md` and above)

- Subscription and purchase records use `minmax(0, 1fr) auto`.
- The left column contains identity and truth: title, primary state, access outcome, date, then contextual explanation.
- The right column contains at most one primary action and its helper/error message.
- Column gap is 24px; record padding is 24px vertically.
- The action column is right-aligned and no wider than 20rem.
- Status and access text stay adjacent to the record title; do not detach them into a summary dashboard.

### Account record layout — mobile (below `md`)

- Collapse records to one column in the same reading order.
- Use 16px vertical gaps and 24px vertical record padding.
- `Manage billing` and `Download file` are full-width, at least 44px high, and appear after all state and date text.
- Long plan/product names wrap; no truncation is allowed.
- No horizontal scrolling is permitted at 320 CSS px or 200% zoom.

### Admin Billing Events shell

- Keep Billing as the final item in the existing sticky Admin workspace navigation.
- Retain the current `max-w-6xl` Admin shell and border-led operational layout.
- The Billing workspace order is fixed:
  1. title, source badge, and one-sentence purpose
  2. reconciliation control and scope explanation
  3. event search and processing-status filter
  4. one shared action/result message region
  5. result count and pagination
  6. billing-event ledger
- Reconciliation remains visually separate from event search because it creates a synthetic audit receipt while search is read-only.
- Do not add revenue metrics, charts, or aggregate status tiles to this workspace.

### Admin event record — desktop (`lg` and above)

- Record header uses `minmax(0, 1fr) auto`: event type and references left; two distinct status badges right.
- Always show both badges:
  - `Receipt · Received`
  - `Processing · {outcome}`
- Evidence uses a four-column definition list in this order:
  1. Received
  2. Processing
  3. Attempts
  4. Object
- Stable processing errors and the recovery row span the full width below evidence.
- Event and object references use the mono family, wrap anywhere, and may display a recognizable prefix plus final 8 characters. The full identifier remains available through selectable text or an accessible `Copy {object type} ID` control if a copy control already exists; do not add icon-only controls.

### Admin event record — tablet/mobile (below `lg`)

- Stack the header, badges, evidence, error, and recovery action in source order.
- At `sm` and above, evidence may use two columns; below `sm`, it is one column.
- Search input, status select, Search, Reconcile, Retry, and pagination controls are full-width below 480px and at least 44px high.
- Provider identifiers use `overflow-wrap:anywhere`; the page itself must never scroll horizontally.
- Keep 16px between evidence groups and 24px between event records.

---

## Spacing Scale

All Phase 2 spacing values are multiples of 4 and use unambiguous Tailwind utility aliases. These aliases are CSS utility references, not additions to or renames of the `@soji/ui` `xs`/`sm`/`md`/`lg`/`xl` token object.

| Tailwind alias | Value | Usage |
|----------------|-------|-------|
| `space-1` | 4px | Badge vertical padding, tightly related metadata |
| `space-2` | 8px | Label-to-value and inline badge gaps |
| `space-4` | 16px | Form groups, mobile record gaps, status-to-explanation |
| `space-6` | 24px | Panel padding, record padding, desktop column gaps |
| `space-8` | 32px | Major control-group and section gaps |
| `space-12` | 48px | Heading-to-first-content separation |
| `space-16` | 64px | Phase-added page section spacing |

**Sizing exception:** interactive controls have a 44px minimum target height. This is a control-size requirement, not a spacing token. No other spacing exceptions are permitted.

The existing `SectionShell` desktop `py-20` value is 80px. It is inherited and unchanged; Phase 2 must not introduce a local spacing token for it.

---

## Typography

Exactly four sizes and two weights are used in the Phase 2 billing surfaces.

| Role | Size | Weight | Line Height | Font |
|------|------|--------|-------------|------|
| Metadata / label / control | 14px | 400 or 600 | 1.45 | Inter |
| Body / status explanation | 16px | 400 or 600 | 1.6 | Inter |
| Section / record-group heading | 24px | 600 | 1.2 | Georgia |
| Page heading / current tier display | 36px | 600 | 1.08 | Georgia |

- Allowed weights are regular `400` and semibold `600` only.
- Uppercase is reserved for short eyebrow and definition-term labels; never uppercase actions or customer status text.
- Account body copy is limited to 68 characters per line where practical.
- Admin identifiers use the existing mono stack at 14px/400; they do not establish a fifth size.
- Ellipses in pending labels use the single Unicode character `…`.
- Raw enum formatting such as `warning_needs_response`, `past_due`, or `charge.dispute.created` is permitted only where the event type is itself useful Admin evidence. Customer UI always uses the mapped labels in this contract.

---

## Color

The existing Product palette remains authoritative.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f4f5f2` | Account/Admin page background |
| Primary surface | `#ffffff` | Account summary, Admin controls, event rows |
| Secondary (30%) | `#eef0ec` | Neutral inset states, empty states, source/ignored badges |
| Foreground | `#201f1c` | Headings, primary text, primary dark actions |
| Muted text | `#655f58` | Dates, helper text, secondary evidence |
| Border | `#c8ccc5` | Section rules, records, inputs, panel boundaries |
| Accent (10%) | `#9b432b` | `Upgrade membership` link, blocked-access emphasis, recovery attention, focus ring |
| Accent muted | `#f4e6df` | Non-destructive warning/error panel background |
| Success | `#2f6f3d` | Active access, receipt stored, processing complete |
| Success muted | `#eef8ed` | Success badge/banner background |
| Warning | `#9a6700` | Processing, payment issue, open investigation |
| Destructive/error | `#b42318` | Failed processing, ended access, destructive provider outcome |

Accent is reserved for:

- Account `Upgrade membership`/membership-option link
- `Payment disputed`, `Access paused`, and recovery-needed emphasis
- non-destructive failure panel border
- the global 3px focus ring

Accent is not the default link or button color. Primary Account and Admin actions remain cocoa (`#201f1c`) with white text; secondary actions use a cocoa border.

### Semantic state mapping

| Meaning | Text | Surface/border |
|---------|------|----------------|
| Active / restored / stored / processed | `#2f6f3d` | `#eef8ed` or white with success border |
| Pending / processing / payment issue / open dispute | `#201f1c` or `#9a6700` | neutral or accent-muted with explicit text label |
| Ignored / canceled / expired / no records | `#655f58` | `#eef0ec` |
| Failed / dispute lost / access ended | `#b42318` | `#f4e6df` with explicit text label |

No meaning depends on color alone. Every badge includes a category and state word. All text/background and focus combinations must meet WCAG 2.2 AA.

---

## Account Information Hierarchy

### Subscription row hierarchy

Every subscription row renders exactly:

1. plan name
2. one primary billing-state label
3. one access-outcome label
4. one semantic date, when available
5. one contextual explanation only when action or interpretation is required
6. `Manage billing`, only when the exact local Stripe subscription is manageable

Do not show both a provider status and an adjustment status as competing primary badges. Use the priority rules below to select one customer-facing primary state.

### Subscription state priority

Evaluate the newest authoritative adjustment and underlying subscription in this order:

1. lost dispute
2. open dispute/inquiry
3. current full-refund block
4. current partial refund
5. underlying subscription status and cancellation flag

A won, warning-closed, or prevented dispute removes its dispute block but does not independently promise access. The underlying subscription and any remaining full-refund block still decide access.

### Subscription billing and access copy

| Authoritative condition | Primary label | Access label | Date / contextual copy |
|-------------------------|---------------|--------------|------------------------|
| `active` | `Active` | `Access active` | `Renews {MMM D, YYYY}` |
| `trialing` | `Trial` | `Access active` | `Trial ends {MMM D, YYYY}` |
| eligible and cancel at period end | `Cancels at period end` | `Access active` | `Access through {MMM D, YYYY}` |
| `incomplete` | `Payment incomplete` | `Access unavailable` | `Complete or update payment in billing. Access returns only after Stripe confirms an eligible subscription.` |
| `past_due` | `Payment issue` | `Access paused` | `Update payment in billing. Access returns only after Stripe confirms an eligible subscription.` |
| `unpaid` | `Unpaid` | `Access paused` | `Review payment in billing. Access returns only after Stripe confirms an eligible subscription.` |
| `paused` | `Paused` | `Access paused` | `Review the subscription in billing. Opening billing does not itself restore access.` |
| `incomplete_expired` | `Checkout expired` | `No access` | `Choose a membership plan to start a new checkout.` |
| `canceled` | `Canceled` | `Access ended` | `Ended {MMM D, YYYY}` when a cancellation date exists |
| open dispute/inquiry | `Payment disputed` | `Access paused` | `Access is paused while the payment dispute is under review.` |
| lost dispute | `Dispute lost` | `Access ended` | `This payment no longer provides membership access.` |
| full refund block | `Payment refunded` | `Access ended` | `A full refund ended access for this subscription.` |
| partial refund and otherwise eligible | `Partially refunded` | `Access active` | `Access continues through the current paid period.` |
| partial refund and underlying status ineligible | underlying status label | matching unavailable/paused/ended label | `A partial refund was recorded; it does not restore access.` |
| dispute won/closed/prevented and otherwise eligible | underlying status label | `Access active` | `The payment dispute is resolved and this subscription is eligible.` |
| dispute won/closed/prevented and underlying status ineligible | underlying status label | matching unavailable/paused/ended label | `The payment dispute is resolved, but this subscription is not currently eligible.` |

Unknown subscription states fail closed:

- Primary label: `Status unavailable`
- Access label: `Access unavailable`
- Explanation: `We could not verify this subscription state. Try again before relying on access.`

Do not replace state labels with raw provider values.

### Portal action

- Visible label: `Manage billing`
- Pending label: `Opening billing…`
- Adjacent helper for first use: `Opens Stripe to update payment methods or cancel this subscription.`
- The action posts only the exact authenticated local subscription ID, then navigates to its Stripe Customer Portal session.
- Render the action only for a Stripe subscription with a bound Customer and a manageable status: active, trialing, incomplete, past due, unpaid, paused, or canceling at period end.
- Do not render it for canceled or expired records.
- Disable all duplicate Portal actions while one request is pending and set the action group to `aria-busy="true"`.
- Opening Portal never changes the Account row optimistically. On return, Account re-reads synchronized provider and durable local state.
- Soji does not add a cancellation confirmation: cancellation occurs and is confirmed in Stripe Customer Portal.

Portal unavailable states:

| Condition | Control | Exact message |
|-----------|---------|---------------|
| Billing delivery not ready | disabled `Billing unavailable` | `Changes are paused until secure billing updates can be recorded. Refresh Account and try again later.` |
| Customer binding not found | keep record unchanged | `Billing management is not available for this subscription yet. Refresh Account after billing finishes syncing.` |
| Portal/session error | keep record unchanged | `Billing management is temporarily unavailable. Refresh Account and try again.` |

Errors use `role="alert"` when caused by the attempted action. Do not display Stripe reasons, Customer IDs, or API response text.
When a published support destination is configured, render an adjacent secondary action labeled `Contact support`; do not construct a provider-specific support URL.

---

## Standalone Purchase Contract

### Purchase row hierarchy

Every purchase row renders:

1. product title
2. one payment/dispute label
3. one access/delivery label
4. purchase date
5. `Download file` only when authorization can be re-evaluated and a private asset exists

### Purchase state copy

| Authoritative condition | Primary label | Access/delivery label | Action |
|-------------------------|---------------|-----------------------|--------|
| `paid` or `no_payment_required`, asset ready | `Payment confirmed` | `Download available` | `Download file` |
| payment pending/delayed | `Payment pending` | `Download available after Stripe confirms payment.` | none |
| partial refund, no blocking dispute | `Partially refunded` | `Download available` | `Download file` |
| full refund | `Refunded` | `Access ended` | none |
| open dispute/inquiry | `Payment disputed` | `Access paused` | none |
| lost dispute | `Dispute lost` | `Access ended` | none |
| dispute won and not fully refunded | `Payment confirmed · Dispute won` or `Partially refunded · Dispute won` | `Download available` | `Download file` |
| warning closed/prevented and not fully refunded | `Payment confirmed · Inquiry closed` or `Partially refunded · Inquiry closed` | `Download available` | `Download file` |
| paid state but asset unavailable | payment label above | `Delivery unavailable` | none |

- A full refund always outranks a won/closed dispute for download access.
- An open or lost dispute always suppresses `Download file`.
- Partial refund never suppresses `Download file` by itself.
- `Download file` has the accessible name `Download {product title}`.
- Every request re-checks immutable owner, purchase/refund/dispute state, and private asset before returning a one-minute signed attachment URL.
- Do not present a permanent asset URL, Storage path, bucket name, or signed token in UI copy.

Download failure copy:

- Heading: `Download unavailable`
- Body: `We could not verify access to this file. Return to Account and try again.`
- Return action: `Return to Account`

---

## Checkout Return Contract

The return banner appears before billing history and must not imply access before synchronized state is visible below.

| State | Heading | Body |
|-------|---------|------|
| confirmed product | `Payment confirmed.` | `Stripe confirmed this purchase. It will appear below after the secure webhook finishes syncing access.` |
| confirmed membership | `Payment confirmed.` | `Stripe confirmed this checkout. Membership access will appear after the secure webhook finishes syncing.` |
| processing | `Payment is still processing.` | `Stripe has completed the checkout flow but has not confirmed payment yet. Refresh this page after the payment method settles.` |
| incomplete | `Checkout was not completed.` | `Stripe has not confirmed a completed payment for this checkout session.` |
| invalid | `This checkout return could not be verified.` | `No payment status is being assumed. Sign in with the account used at checkout and review the records below.` |
| unavailable | `Payment status is temporarily unavailable.` | `No payment status is being assumed. Your purchase will appear below after Stripe and the billing webhook confirm it.` |

- Confirmed banners use success-muted styling but never say `Access granted`.
- Processing uses warning styling.
- Incomplete and invalid use neutral styling.
- Unavailable uses accent-muted styling.
- The banner is a `role="status"` region and does not move focus.

---

## Admin Billing Events Contract

### Workspace heading and controls

| Element | Exact copy |
|---------|------------|
| Heading | `Billing Events` |
| Description | `Signed Stripe receipts and their independent Soji processing outcomes.` |
| Source badge | `Live` or `Demo` |
| Reconciliation label | `Reconcile from Stripe` |
| Reconciliation placeholder | `sub_… or cus_…` |
| Reconciliation action | `Reconcile billing` |
| Reconciliation pending | `Reconciling…` |
| Reconciliation helper | `Pulls current Stripe subscription data, reapplies access rules, and records a synthetic receipt. Use a subscription or customer ID only.` |
| Search label | `Search billing events` |
| Search placeholder | `Event, dispute, payment, subscription, or customer ID` |
| Processing filter label | `Processing status` |
| Search action | `Search events` |
| Search pending | `Searching…` |

Search must be bounded and case-safe across stored minimized references for:

- provider event ID
- event type
- dispute ID
- PaymentIntent ID
- subscription ID
- Stripe Customer ID

Search must not require or expose full provider payloads. Search by customer email is not permitted.

### Receipt and processing states

Every stored row has a distinct receipt statement:

- Badge: `Receipt · Received`
- Evidence value: `Received and stored`
- Evidence date: localized date, time, and short time-zone label

Processing badge and evidence use:

| Stored state | Badge/outcome | Supporting copy | Recovery |
|--------------|---------------|-----------------|----------|
| `received` | `Processing · Awaiting` | `No processing attempt has completed.` | Retry available |
| active `processing` lease | `Processing · In progress` | `Another worker is processing this event.` | no Retry |
| expired `processing` lease | `Processing · Lease expired` | `The processing lease expired before the event settled.` | Retry available |
| `processed` | `Processing · Complete` | `Soji processing completed.` | none |
| `ignored` | `Processing · No handler` | `The signed event is retained, but this type does not change Soji state.` | none |
| `failed` | `Processing · Failed` | stable, secret-free processing error | Retry available |

Receipt is never labeled failed once the verified event is stored. An ignored processing outcome is never labeled unreceived or unsuccessful delivery.

### Event/object references

Display references in this order:

1. event type
2. provider event ID
3. affected object type and ID, when stored
4. related subscription/customer suffix, when useful

Use operational labels such as `Event`, `Dispute`, `Payment`, `Subscription`, and `Customer`. Never display internal user IDs, customer email, card data, full payloads, signatures, tokens, or secrets.

### Attempt/timing evidence

Each row shows:

- `Received` — received/stored time
- `Processing` — processed/ignored/failed time, or `Not completed`
- `Attempts` — integer attempt count
- `Last attempt` — time, or `No processing attempt recorded`
- `Lease started` — only for a currently processing event

Dates use semantic `<time datetime="{UTC ISO value}">` and visible localized text with a time-zone label. Do not print raw ISO strings.

### Retry

- Visible action: `Retry processing`
- Pending action: `Retrying…`
- Original provider event helper: `Retry loads the original event from Stripe and runs the same idempotent processor.`
- Synthetic reconciliation helper: `Retry uses the stored Stripe identifier and refreshes the current subscription state.`
- Retry is available only for `received`, `failed`, or expired-processing records.
- Retry is unavailable for active processing, processed, and ignored records.
- Do not ask for confirmation. Retry is an explicit, bounded, idempotent recovery action.
- While Retry is pending, disable Retry for that record but do not disable search or pagination.
- Keep the record in place and preserve its height. On success, update its processing evidence and return focus to the record heading.

Retry result copy:

| Result | Exact message |
|--------|---------------|
| processed | `Billing event processed successfully.` |
| ignored | `Billing event stored; this event type has no Soji handler.` |
| failed | `This event could not be retried. Review its latest processing state, then try again or reconcile from Stripe.` |
| active lease | `This event is already being processed. Retry becomes available if its lease expires.` |

### Reconciliation

- Accept only `sub_…` and `cus_…` identifiers.
- Field validation: `Enter a Stripe subscription ID (sub_…) or customer ID (cus_…).`
- Success: `Reconciled {N} subscription(s); closed {N} stale local record(s).`
- Failure: `Billing reconciliation failed. Confirm the Stripe identifier, then try again.`
- Do not ask for confirmation. The helper text must explain that reconciliation re-reads provider state and records an audit event.
- On success, prepend the synthetic receipt, reset search/filter to the first page, announce the result, and focus the new record heading.
- Reconciliation does not accept event, dispute, Charge, or PaymentIntent IDs.

### Empty, no-match, and query-error states

| Condition | Heading | Body / next step |
|-----------|---------|------------------|
| no stored receipts | `No billing events recorded yet.` | `Signed Stripe receipts will appear here after the webhook stores them.` |
| search has no matches | `No matching billing events.` | `Change the identifier or processing-status filter and search again.` |
| initial query failure | `Billing events could not be loaded.` | `Refresh this workspace or check service health before taking a recovery action.` |
| search failure | `Billing events could not be searched.` | `The current results are unchanged. Try the search again.` |
| role denied | `Admin role required to inspect billing events.` | `Return to Account, or ask an owner to grant the required Admin role.` |

Initial query and search errors use `role="alert"`. Empty and no-match states are routine status regions.

For the role-denied state, render no operational controls. Render one action labeled `Return to Account` linking to `/account`.

### Pagination

- Visible count: `Showing {first}–{last} of {total}`
- Controls: `Previous`, `Page {page} of {totalPages}`, `Next`
- Pagination retains the current query and processing filter.
- Searching resets to page 1.
- At one page, Previous and Next remain visible but disabled to keep geometry stable.

---

## Loading and Async-State Contract

### Account initial loading

- Preserve the page heading and section geometry; do not flash `Free`, `No access`, `No subscriptions`, or `No purchases` before data resolves.
- Use neutral border-led placeholders for the current tier, subscription records, and purchase records.
- Include one visually hidden `role="status"` message: `Loading account billing…`
- Do not use an indeterminate full-page spinner.

### Admin initial loading

- Keep the Billing workspace title visible.
- Render disabled reconciliation/search controls and three neutral ledger-row placeholders.
- Set the workspace container to `aria-busy="true"`.
- Include one `role="status"` message: `Loading billing events…`

### Local actions

- Pending labels name the operation: `Opening billing…`, `Searching…`, `Retrying…`, or `Reconciling…`.
- Do not use `Working…`, animated ellipsis dots, or optimistic access/status changes.
- Pending controls retain their width; pair the text change with `aria-busy`.
- Search retains the current results while pending.
- Retry retains the current event state while pending.
- Reconciliation retains the current ledger while pending.

---

## Error and Fail-Closed Contract

- If Account auth, subscription, purchase, adjustment, or entitlement truth cannot be verified, paid access and destructive/financial actions remain unavailable.
- Query errors do not fall back to demo data on a live source.
- Never translate a query failure into `No subscriptions`, `No purchases`, `No billing events`, `Free`, or `Access ended`; use an explicit unavailable state.
- Stable customer error copy may name Stripe only where the user knowingly entered Stripe Checkout or Portal. It never includes raw provider reasons.
- Stable Admin errors may name the operation and bounded object category, but never include raw event payload, customer email, token, signature, secret, or stack trace.

Required Account errors:

| Surface | Heading | Body |
|---------|---------|------|
| account/session | `Account services are temporarily unavailable` | `Authentication or membership data could not be verified. Access below is shown conservatively; try again before purchasing or changing billing.` |
| subscriptions | `Subscriptions could not be refreshed` | `Your access is being shown conservatively. Try again before changing billing.` |
| purchases | `Purchases could not be refreshed` | `Payment status is being shown conservatively. Try again before purchasing the same item.` |
| billing readiness | `Billing management is temporarily unavailable` | `Subscription changes are paused until secure billing updates can be recorded. Your current subscription has not been changed. Refresh Account and try again later. If billing remains unavailable, use the published Support link.` |

---

## Copywriting Contract

| Element | Required copy |
|---------|---------------|
| Account primary billing CTA | `Manage billing` |
| Product delivery CTA | `Download file` |
| Membership expansion CTA | `Upgrade membership` |
| Subscription empty state | `No membership subscriptions have been recorded for this account.` |
| Purchase empty state | `No standalone purchases have been recorded for this account.` |
| Admin primary recovery CTA | `Retry processing` |
| Admin reconciliation CTA | `Reconcile billing` |
| Admin empty heading | `No billing events recorded yet.` |
| Admin no-match heading | `No matching billing events.` |
| Portal unavailable action | `Billing unavailable` |
| Product open dispute | `Payment disputed` / `Access paused` |
| Product lost dispute | `Dispute lost` / `Access ended` |
| Product full refund | `Refunded` / `Access ended` |
| Membership full refund | `Payment refunded` / `Access ended` |

### Destructive actions

There are no destructive Soji actions in this Phase 2 UI:

- subscription cancellation remains inside Stripe Customer Portal, which owns its confirmation
- refund and dispute mutations remain Stripe/UAT operations
- Retry and reconciliation are bounded, idempotent recovery actions and do not require confirmation

Do not add `Cancel subscription`, `Issue refund`, `Accept dispute`, `Delete receipt`, or `Clear event` controls.

---

## Accessibility and Interaction Contract

- The Account/Admin page title is the only `h1`; section headings are `h2`; record titles are `h3`.
- Every input and select has a persistent visible label. Placeholders are examples, not labels.
- All controls meet a 44×44px minimum target.
- Keyboard order follows the visual order defined in this contract.
- Pressing Enter in Admin search submits the search; pressing Enter in reconciliation submits reconciliation only when focus is in that field.
- Receipt and processing badges each include text; state never depends on color, icon, position, or punctuation alone.
- Account state changes caused by server navigation use routine status semantics. Async failures use `role="alert"`; async successes use one `aria-live="polite"` status region.
- Admin must not create one live region per event. Use one shared action/result region to avoid duplicate announcements.
- After a no-match search, focus the no-match heading. After a search error, focus the alert. After successful Retry, return focus to that event heading. After successful reconciliation, focus the new synthetic event heading.
- Focus remains the global 3px clay ring with 3px offset and must not be removed by local `outline-none` without an equivalent focus-visible style.
- Status badges, error panels, and disabled actions meet WCAG 2.2 AA contrast.
- Provider/object references wrap and remain selectable at 200% zoom.
- Dates use semantic `<time>` elements; visible Account dates are `MMM D, YYYY`; visible Admin dates include time and time zone.
- Respect `prefers-reduced-motion`. Any color/opacity transition is at most 150ms and removed under reduced motion.
- No new auto-refresh is introduced. The existing processing-lease label may update every 30 seconds without moving focus or announcing routine time changes.
- At 320 CSS px, 375×812, 1280×800, and 200% zoom, there is no clipped status, hidden action, overlapping badge, or horizontal overflow.

---

## Privacy and Evidence Boundary

- Account shows only the signed-in customer's plan/product labels, customer-safe state, dates, and actions.
- Admin may show bounded provider/object identifiers because they are operational evidence, but never customer email, card data, payload bodies, signatures, tokens, cookies, or secret values.
- UAT screenshots use redacted subject labels and ID suffixes only.
- Provider-backed PASS evidence is limited to Stripe test mode against the canonical deployed Web app. Demo/mocked rows must retain `Demo` source labeling and must not visually imply production proof.
- Browser return parameters never grant access or produce an `Access active` label without synchronized state.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None | Not applicable — `components.json` absent; owner locked no initialization; inspected 2026-07-26 |
| Third-party registries | None | No registry code allowed in Phase 2; inspected 2026-07-26 |

Any plan that introduces a registry block, new component library, remote code generator, or copied third-party billing dashboard violates this contract and must return to UI review before implementation.

---

## Visual Verification Matrix

| Route/state | Desktop | 375×812 | 320px / 200% | Keyboard | Axe |
|-------------|---------|---------|--------------|----------|-----|
| `/account` active membership | Required | Required | Required | Required | Required |
| `/account` active + cancel at period end | Required | Required | Required | Required | Required |
| `/account` incomplete/past due/unpaid/paused | Required | Required | Required | Required | Required |
| `/account` membership dispute open/won/lost | Required | Required | Required | Required | Required |
| `/account` membership partial/full refund | Required | Required | Required | Required | Required |
| `/account` product paid/pending/asset unavailable | Required | Required | Required | Required | Required |
| `/account` product partial/full refund | Required | Required | Required | Required | Required |
| `/account` product dispute open/won/lost | Required | Required | Required | Required | Required |
| `/account` Portal ready/pending/unavailable/error | Required | Required | Required | Required | Required |
| `/account` Checkout confirmed/processing/invalid/unavailable | Required | Required | Required | Required | Required |
| `/account` loading/empty/query failure | Required | Required | Required | Required | Required |
| `/admin?view=billing` receipt + processed | Required | Required | Required | Required | Required |
| `/admin?view=billing` ignored | Required | Required | Required | Required | Required |
| `/admin?view=billing` failed + Retry | Required | Required | Required | Required | Required |
| `/admin?view=billing` active/expired processing lease | Required | Required | Required | Required | Required |
| `/admin?view=billing` search/no-match/error | Required | Required | Required | Required | Required |
| `/admin?view=billing` reconciliation success/failure | Required | Required | Required | Required | Required |
| `/admin?view=billing` loading/empty/role denied | Required | Required | Required | Required | Required |

Verification must assert:

- receipt and processing outcomes remain visibly separate
- raw customer-facing enums and identifiers do not leak
- `Download file` is absent for pending, fully refunded, open-dispute, and lost-dispute purchases
- `Download file` remains available after partial refund and eligible dispute resolution
- membership access labels follow adjustment priority and never derive from the return query
- Portal actions do not appear for an unrelated or unmanageable subscription
- all pending, empty, error, and no-match copy matches this contract

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS with one non-blocking recommendation resolved
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-26
