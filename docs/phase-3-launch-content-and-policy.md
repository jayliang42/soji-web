# Phase 3 Launch Content and Customer Policy

This runbook closes Phase 3 without turning repository checks into claims about external
providers or owner approval. The authoritative ledger is
[03-UAT-EVIDENCE.md](../.planning/phases/03-launch-content-and-customer-policy/03-UAT-EVIDENCE.md).

## Automated release checks

Run the local gates before any owner or provider observation:

```sh
node --test scripts/check-phase3-uat-evidence.test.mjs
corepack pnpm phase3:uat:check
corepack pnpm --filter @soji/domain test
corepack pnpm --filter @soji/web test
corepack pnpm --filter @soji/web typecheck
corepack pnpm --filter @soji/web lint
corepack pnpm db:schema:check
corepack pnpm db:types:check
corepack pnpm --filter @soji/web build
corepack pnpm --filter @soji/web test:e2e
corepack pnpm docs:check
```

These commands prove repository behavior only. They do not approve policy text, validate a
support response, prove an event destination, or prove hosted consent on a deployed Checkout.

## Evidence handling

- Keep every scenario ID exactly once.
- Automated `PASS` rows require the command and commit that produced the result.
- Owner/provider rows remain `PENDING` until directly observed on the canonical deployment.
- Record only the UTC timestamp and a redacted outcome. Never record addresses, destinations,
  account identifiers, cookies, tokens, secrets, provider payloads, or full object IDs.
- Use `FAIL` for a mismatch and `BLOCKED` when a prerequisite prevents the observation.
- Run `corepack pnpm phase3:uat:check` after every ledger edit.
- Run `corepack pnpm phase3:uat:ready` only as the final gate; it must fail while any row is
  pending.

## Consolidated owner checkpoint

Complete this list in one session. These are all Phase 3 owner/provider inputs; no other
Phase 3 login is required.

1. In Soji Admin → Office Hours, enter the real signup destination and real replay destination,
   then verify both with one entitled test member. Record only redacted success or failure in
   `PH3-OFFICE-MEMBER-SIGNUP` and `PH3-OFFICE-MEMBER-REPLAY`.
2. In the production environment settings, set `NEXT_PUBLIC_SUPPORT_URL` to the durable HTTPS
   help destination or clean support mail action. Open Support on the canonical deployment and
   record only whether the channel responded in `PH3-SUPPORT-RESPONSE`.
3. Have the business owner or qualified reviewer inspect Support, Privacy, Terms, Refund policy,
   and Financial disclaimer. After approval, set `SOJI_POLICIES_APPROVED=true` and record the
   redacted approval observation in `PH3-POLICY-OWNER-APPROVAL`.
4. In Stripe Dashboard → Settings → Public details / policy links, set the canonical Terms and
   public policy destinations and enable hosted Terms acceptance. After a test-mode Checkout
   visibly requires acceptance, set `STRIPE_TERMS_ACCEPTANCE_READY=true` and record the redacted
   outcome in `PH3-STRIPE-TERMS-LIVE`.
5. On the canonical deployment, verify the flagship as a guest, a signed-in member without the
   required membership, and an entitled member. Record only the three resulting states in
   `PH3-CANONICAL-CONTENT-STATES`.
6. Run the structure validator, then the final ready gate:

```sh
corepack pnpm phase3:uat:check
corepack pnpm phase3:uat:ready
```

If the ready gate fails, correct the named row or external prerequisite. Never promote a row
from configuration inspection, mock data, or repository tests.

## Recovery boundaries

- Invalid or placeholder Office Hours destinations: correct them through Admin; do not edit the
  database around the validator.
- Support or policy readiness false: Checkout should remain unavailable. Correct the exact
  owner input and redeploy normally.
- Hosted Terms missing: leave the provider row pending and payment initiation closed.
- Content-state mismatch or restricted-text exposure: mark the scenario `FAIL`, stop launch,
  and repair the access projection before another canonical observation.
