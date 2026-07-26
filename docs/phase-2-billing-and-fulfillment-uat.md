# Phase 2 Billing and Fulfillment UAT

This runbook records the canonical, test-mode verification required for Phase 2. It is an
operator guide, not proof that any scenario passed. The authoritative ledger is
[02-UAT-EVIDENCE.md](../.planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md).

## Safety and evidence rules

- Run provider scenarios only against `https://soji-web.vercel.app` and Stripe test mode.
- Never enter a real payment method or use a live-mode Stripe key. A key beginning with
  `sk_live_` is a stop condition.
- Supply secrets through the operator's secure environment. Never paste secret values into a
  command, terminal capture, ledger row, screenshot, issue, or chat.
- Record only redacted user labels, provider object type, and the last eight object-ID
  characters. Do not record email addresses, full provider IDs, card numbers, tokens,
  cookies, authorization headers, connection strings, raw webhook bodies, or raw API payloads.
- Repository tests, fixtures, mock events, configuration inspection, and dry runs are useful
  prerequisites, but they cannot make a provider-observation row `PASS`.
- A provider row may become `PASS` only after a live Stripe test-mode observation on the
  canonical origin agrees with the expected Account page, Admin page, and access state.
- Use `FAIL` for an observed mismatch and `BLOCKED` when a prerequisite prevents observation.
  Leave unexecuted rows `PENDING`; never infer or copy a result.
- Keep captures private and short-lived. Start with `umask 077`, and delete temporary captures
  only after the validator and evidence review succeed.
- Do not edit a deployment inspection to add missing commit metadata. If the authoritative
  inspection does not contain the exact release commit, the deployment gate must fail closed.

## Local artifact checks

Run these before any provider or production operation:

```sh
corepack pnpm phase2:uat:check
node --test scripts/check-phase2-uat-evidence.test.mjs
corepack pnpm docs:check
node scripts/check-phase2-uat-evidence.mjs --require-all-status PENDING
```

The last command proves only that the ledger has the exact 25 IDs and that every scenario is
still pending. It does not prove runtime behavior.

## Authorized production sequence

The production sequence belongs to Plan 02-06 and requires explicit operator authorization,
valid provider authentication, and a reviewed release commit. This document describes the
sequence without performing it.

### 1. Capture and validate schema preflight

```sh
umask 077
corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 migration list > /tmp/soji-phase2-migrations-before.txt
corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 db push --dry-run > /tmp/soji-phase2-dryrun-before.txt
node scripts/check-phase2-uat-evidence.mjs --prepush --migration-list /tmp/soji-phase2-migrations-before.txt --dry-run /tmp/soji-phase2-dryrun-before.txt --expected-pending 20260726000000
```

Review the pending migration before one authorized push. Do not use seed, reset, repair, or
manual SQL shortcuts.

```sh
corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 db push
corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 migration list > /tmp/soji-phase2-migrations-after.txt
corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 db push --dry-run > /tmp/soji-phase2-dryrun-after.txt
node scripts/check-phase2-uat-evidence.mjs --postpush --migration-list /tmp/soji-phase2-migrations-after.txt --dry-run /tmp/soji-phase2-dryrun-after.txt
node scripts/check-phase2-uat-evidence.mjs --production-schema
```

`--production-schema` reads `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from the secure environment. Its public output is limited to
boolean schema checks; it must never print the service-role key or raw database responses.
After the check succeeds, change only `BILL-DB-SCHEMA-PARITY` using the observed boolean
result, then run:

```sh
corepack pnpm phase2:uat:check
node scripts/check-phase2-uat-evidence.mjs --require-pass BILL-DB-SCHEMA-PARITY
```

### 2. Pin and validate the release input

Create a clean detached worktree from the reviewed commit. Do not deploy the mutable working
tree.

```sh
install -m 600 /dev/null /tmp/soji-phase2-release-commit.txt
install -m 600 /dev/null /tmp/soji-phase2-release-worktree.txt
git rev-parse HEAD > /tmp/soji-phase2-release-commit.txt
release_commit="$(tr -d '\n' < /tmp/soji-phase2-release-commit.txt)"
release_tree="$(mktemp -d /tmp/soji-phase2-release.XXXXXX)"
printf '%s\n' "$release_tree" > /tmp/soji-phase2-release-worktree.txt
git worktree add --detach "$release_tree" "$release_commit"
node scripts/check-phase2-uat-evidence.mjs --release-inputs --worktree-file /tmp/soji-phase2-release-worktree.txt --commit-file /tmp/soji-phase2-release-commit.txt
```

The release-input gate requires the detached `HEAD` to equal the requested full commit, the
tree to be clean, required configuration to be tracked, and the scanned release files to be
free of secrets. Stop on any mismatch.

### 3. Deploy and prove identity

Before the first production configuration, link, or deployment operation, rerun the release
gate and build checks from the detached tree:

```sh
node scripts/check-phase2-uat-evidence.mjs --release-inputs --worktree-file /tmp/soji-phase2-release-worktree.txt --commit-file /tmp/soji-phase2-release-commit.txt
release_tree="$(tr -d '\n' < /tmp/soji-phase2-release-worktree.txt)"
corepack pnpm --dir "$release_tree" --filter @soji/web build
corepack pnpm --dir "$release_tree" deploy:check
```

Stop if any of those three gates fails. Only after they pass and the production operation is
explicitly authorized, use the repository's deployment workflow from the validated detached
tree. Capture the authoritative JSON inspection without displaying secrets:

```sh
vercel inspect https://soji-web.vercel.app --format=json > /tmp/soji-phase2-vercel-inspect.json
node scripts/check-phase2-uat-evidence.mjs --deployment /tmp/soji-phase2-vercel-inspect.json --expected-commit-file /tmp/soji-phase2-release-commit.txt --expected-alias https://soji-web.vercel.app
```

The deployment proof must name the expected project, production target, `READY` state,
canonical alias, deployment URL, and exact release commit. If the CLI capture omits the
commit, stop and obtain an authoritative machine-readable capture that contains it; never add
the field by hand.

### 4. Probe canonical readiness

With `STRIPE_SECRET_KEY` supplied securely as a Stripe test-mode key, run:

```sh
node scripts/check-phase2-uat-evidence.mjs --production-schema
node scripts/check-phase2-uat-evidence.mjs --canonical-readiness https://soji-web.vercel.app
```

The readiness gate requires HTTP 200 from the exact canonical origin, Supabase-backed
`/api/me`, all nine public schema booleans, and a test-mode Stripe key. It emits only
non-sensitive readiness facts.

## Scenario execution protocol

For every scenario below:

1. Use a fresh or deliberately selected redacted subject on the canonical origin.
2. Record the pre-action Account, Admin, and access state.
3. Perform only the named Stripe test-mode action.
4. Wait for normal webhook processing, refresh the canonical UI, and compare all expected
   surfaces.
5. Record UTC date, redacted subject, object type, last-eight suffix, expected result, observed
   result, and recovery notes in the matching ledger row.
6. Run `corepack pnpm phase2:uat:check`. Set `PASS` only when the live observation satisfies
   the scenario; otherwise use `FAIL` or `BLOCKED`.

## BILL-DB-SCHEMA-PARITY — Production schema parity

- **Action:** Run the preflight, one authorized migration push, postflight, and
  `--production-schema` sequence.
- **Expected state:** Account and Admin behavior remain available; access decisions are
  unchanged; all nine schema booleans are true with zero catalog, purchase, and subscription
  mismatch counts.
- **Recovery:** Stop before deployment if any boolean is false or any migration remains
  pending; investigate schema drift without seed, reset, repair, or manual SQL.
- **Redaction:** Record `schema_version` and its suffix only, plus boolean observations. Never
  record service-role credentials or raw query output.

## BILL-01-CATALOG — Canonical catalog

- **Action:** Open pricing and compare the three purchasable tiers with Stripe test-mode
  catalog configuration.
- **Expected state:** Account shows the current tier or free state; Admin shows no false
  billing transition; access remains unchanged; all three tiers use the expected active
  test-mode prices.
- **Recovery:** Block checkout and correct catalog configuration before retrying if a tier,
  interval, amount, or price is wrong.
- **Redaction:** Record `price` plus the last eight characters of the observed price ID, never
  the full ID or API response.

## BILL-01-PORTAL-CONFIG — Customer portal configuration

- **Action:** Open the Stripe test-mode customer portal from the canonical Account page.
- **Expected state:** Account remains on the current paid tier until an action is confirmed;
  Admin shows the same subscription; access is unchanged; the portal offers the intended
  cancellation controls.
- **Recovery:** Exit without changing the subscription, correct portal configuration, and
  retry with the same redacted subject.
- **Redaction:** Record `customer_portal` and a non-sensitive suffix; do not record session
  URLs, customer IDs, or email addresses.

## BILL-03-TIER-1-CHECKOUT — Tier 1 checkout

- **Action:** Complete a Tier 1 canonical checkout with Stripe's approved test payment
  method.
- **Expected state:** Account shows Tier 1 active; Admin shows the paid subscription and
  processed receipt; Tier 1 access is granted once and no higher-tier access appears.
- **Recovery:** On mismatch, record `FAIL`, preserve the redacted object suffix, and use the
  normal webhook retry or reconciliation path before another checkout.
- **Redaction:** Record `checkout_session` or `subscription` and last eight characters only.

## BILL-03-TIER-2-CHECKOUT — Tier 2 checkout

- **Action:** Complete a Tier 2 canonical checkout with Stripe's approved test payment
  method.
- **Expected state:** Account shows Tier 2 active; Admin shows the paid subscription and
  processed receipt; Tier 2 access is granted once and Tier 3-only access remains denied.
- **Recovery:** Record `FAIL` and reconcile the same event before creating another checkout.
- **Redaction:** Record object type and last-eight suffix only; omit customer identity and
  checkout URL.

## BILL-03-TIER-3-CHECKOUT — Tier 3 checkout

- **Action:** Complete a Tier 3 canonical checkout with Stripe's approved test payment
  method.
- **Expected state:** Account shows Tier 3 active; Admin shows the paid subscription and
  processed receipt; Tier 3 access is granted once.
- **Recovery:** Record `FAIL` and use normal retry or reconciliation; do not manually grant
  access.
- **Redaction:** Record object type and last-eight suffix only; omit payment and customer
  details.

## BILL-03-CUSTOMER-REUSE — Existing Stripe customer reuse

- **Action:** Start another allowed checkout for a subject that already owns a Stripe
  test-mode customer.
- **Expected state:** Account and Admin retain one logical customer relationship; access
  follows the resulting paid tier; no duplicate customer is created for the same subject.
- **Recovery:** Stop additional checkout attempts, record both safe suffix observations if
  duplication occurred, and reconcile before retrying.
- **Redaction:** Record the reused `customer` last-eight suffix only, never the full customer
  ID or email.

## BILL-03-PORTAL-CANCEL — Portal cancellation

- **Action:** Cancel an active test subscription through the canonical customer portal flow.
- **Expected state:** Account shows the correct cancellation or end-of-period state; Admin
  shows the matching subscription status; access follows the product's cancellation policy
  without a manual override.
- **Recovery:** Retry normal webhook delivery or reconciliation for the same subscription;
  do not edit membership state directly.
- **Redaction:** Record `subscription` and its last-eight suffix only; omit portal session
  data.

## BILL-02-SIGNED-RECEIPT — Signed webhook receipt

- **Action:** Deliver a genuine signed Stripe test-mode event through the configured webhook
  path.
- **Expected state:** Account reflects the event's billing effect; Admin shows one processed
  receipt; access changes exactly once if the event requires it.
- **Recovery:** Use Stripe's normal retry for the same event, then reconciliation if needed;
  never fabricate a signature.
- **Redaction:** Record `event` and its last-eight suffix only; never store signature headers
  or the raw payload.

## BILL-02-IGNORED-RECEIPT — Ignored webhook receipt

- **Action:** Deliver a genuine signed, unsupported Stripe test-mode event.
- **Expected state:** Account, Admin billing state, and access remain unchanged; the receipt
  is durably marked ignored rather than failed.
- **Recovery:** If state changes or the receipt is misclassified, record `FAIL` and stop
  further event testing until corrected.
- **Redaction:** Record `event` and last-eight suffix only; omit the raw payload.

## BILL-02-FAILED-RETRY — Failed receipt and retry

- **Action:** Observe a genuine Stripe test-mode receipt fail through an allowed recoverable
  condition, then retry the same event after the condition is removed.
- **Expected state:** Account and access do not partially advance on failure; Admin first shows
  failed and later processed for the same receipt, with one final transition.
- **Recovery:** Use provider retry or the supported reconciliation path for the same event;
  do not create a replacement event to hide the failure.
- **Redaction:** Record one `event` suffix and state transitions only; omit error payloads that
  contain customer data.

## BILL-02-RECONCILIATION — Webhook reconciliation

- **Action:** Run the authorized reconciliation path for a known Stripe test-mode event whose
  receipt requires recovery.
- **Expected state:** Account and Admin converge on the provider state; access reaches the
  correct final state once; the durable receipt records the reconciliation outcome.
- **Recovery:** Stop and investigate if the provider object cannot be fetched or the result
  diverges; do not manually edit billing rows.
- **Redaction:** Record `event` or reconciled object type and the last-eight suffix only.

## BILL-04-PRODUCT-CATALOG — Digital product catalog

- **Action:** Open the canonical digital-product catalog and compare purchasable items with
  active Stripe test-mode prices.
- **Expected state:** Account shows the correct owned/unowned state; Admin shows no invented
  purchase; access is unchanged until payment; product labels and prices match the catalog.
- **Recovery:** Block purchase and correct catalog mapping before retrying.
- **Redaction:** Record `price` and last-eight suffix only, not full product or price IDs.

## BILL-04-PRODUCT-DELIVERY — Paid product delivery

- **Action:** Complete one digital-product checkout on the canonical origin.
- **Expected state:** Account shows the product as owned; Admin shows one completed purchase
  and processed receipt; download access is granted exactly once.
- **Recovery:** Retry the same webhook or reconcile the same object; do not create a manual
  entitlement.
- **Redaction:** Record `payment_intent` or `checkout_session` and last-eight suffix only.

## BILL-04-UNAUTHORIZED-DOWNLOAD — Unauthorized download denial

- **Action:** Request the protected download as a signed-in subject that does not own the
  product.
- **Expected state:** Account remains unowned; Admin records no purchase; access is denied
  without revealing the file or storage URL.
- **Recovery:** If access succeeds, record `FAIL`, disable the affected delivery path, and
  investigate authorization before continuing.
- **Redaction:** Record `download_attempt` with a non-sensitive suffix; never record signed
  URLs or file tokens.

## BILL-04-PARTIAL-REFUND — Partial product refund

- **Action:** Issue a partial refund for a completed Stripe test-mode product purchase.
- **Expected state:** Account shows the purchase with the correct partial-refund state; Admin
  shows updated refunded amount; access follows the documented partial-refund policy.
- **Recovery:** Retry or reconcile the same refund event; do not edit the purchase total or
  entitlement manually.
- **Redaction:** Record `refund` and last-eight suffix only; omit amounts tied to customer
  identity beyond the expected test observation.

## BILL-04-FULL-REFUND — Full product refund

- **Action:** Issue a full refund for a completed Stripe test-mode product purchase.
- **Expected state:** Account shows fully refunded; Admin shows the final refund total; product
  access is revoked according to policy.
- **Recovery:** Retry or reconcile the same refund event; do not manually revoke access as a
  substitute for receipt processing.
- **Redaction:** Record `refund` and last-eight suffix only.

## BILL-04-DISPUTE-OPEN — Product dispute opened

- **Action:** Use Stripe test mode to open a dispute against a completed product purchase.
- **Expected state:** Account shows the purchase's dispute state where designed; Admin shows
  the open dispute; access follows the open-dispute policy.
- **Recovery:** Reconcile the same dispute object if the webhook is delayed; do not synthesize
  a dispute row.
- **Redaction:** Record `dispute` and last-eight suffix only; omit evidence documents and raw
  payload.

## BILL-04-DISPUTE-WON — Product dispute won

- **Action:** Advance the same product dispute to the won outcome in Stripe test mode.
- **Expected state:** Account and Admin show the won resolution; purchase totals are
  consistent; access follows the won-dispute policy.
- **Recovery:** Retry or reconcile the same dispute before any new scenario.
- **Redaction:** Record the same `dispute` last-eight suffix only.

## BILL-04-DISPUTE-LOST — Product dispute lost

- **Action:** Advance a product dispute to the lost outcome in Stripe test mode.
- **Expected state:** Account and Admin show the lost resolution; purchase totals are
  consistent; access follows the lost-dispute policy.
- **Recovery:** Retry or reconcile the same dispute; do not adjust balances or access
  directly.
- **Redaction:** Record `dispute` and last-eight suffix only.

## BILL-05-PARTIAL-REFUND — Subscription partial refund

- **Action:** Issue a partial refund for a paid Stripe test-mode subscription invoice.
- **Expected state:** Account retains the correct subscription state with partial-refund
  context; Admin shows the refunded amount; tier access follows subscription policy.
- **Recovery:** Retry or reconcile the same refund event without editing subscription rows.
- **Redaction:** Record `refund` and last-eight suffix only.

## BILL-05-FULL-REFUND — Subscription full refund

- **Action:** Issue a full refund for a paid Stripe test-mode subscription invoice.
- **Expected state:** Account and Admin show the full refund and correct subscription status;
  tier access follows the full-refund policy.
- **Recovery:** Retry or reconcile the same event; do not manually change membership.
- **Redaction:** Record `refund` and last-eight suffix only.

## BILL-05-DISPUTE-OPEN — Subscription dispute opened

- **Action:** Use Stripe test mode to open a dispute against a subscription charge.
- **Expected state:** Account shows the appropriate billing state; Admin shows the open
  dispute; tier access follows the open-dispute policy.
- **Recovery:** Reconcile the same dispute if delivery is delayed; do not create a replacement
  billing event.
- **Redaction:** Record `dispute` and last-eight suffix only.

## BILL-05-DISPUTE-WON — Subscription dispute won

- **Action:** Advance the same subscription dispute to the won outcome in Stripe test mode.
- **Expected state:** Account and Admin show the won resolution; subscription totals remain
  consistent; tier access follows the won-dispute policy.
- **Recovery:** Retry or reconcile the same dispute before continuing.
- **Redaction:** Record the same `dispute` last-eight suffix only.

## BILL-05-DISPUTE-LOST — Subscription dispute lost

- **Action:** Advance a subscription dispute to the lost outcome in Stripe test mode.
- **Expected state:** Account and Admin show the lost resolution; subscription totals remain
  consistent; tier access follows the lost-dispute policy.
- **Recovery:** Retry or reconcile the same dispute; do not manually modify access or totals.
- **Redaction:** Record `dispute` and last-eight suffix only.

## Final closeout

After all 25 rows are based on canonical observations:

```sh
corepack pnpm phase2:uat:check
node scripts/check-phase2-uat-evidence.mjs --require-all-status PASS
corepack pnpm phase2:uat:ready
```

`phase2:uat:ready` is the final artifact gate, not a substitute for reviewing the canonical
Account, Admin, access, Stripe test-mode, schema, deployment, and readiness evidence. Any
`FAIL`, `BLOCKED`, `PENDING`, privacy violation, malformed row, or fabricated observation
keeps the phase incomplete.
