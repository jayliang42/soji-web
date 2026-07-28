# Phase 4 Experience and Operations Acceptance

Phase 4 closes every repository-verifiable launch gate and keeps production truth separate.
The authoritative ledger is
[04-UAT-EVIDENCE.md](../.planning/phases/04-experience-and-operations-acceptance/04-UAT-EVIDENCE.md).

## Automated release checks

Run these without production login or configuration changes:

```sh
node --test scripts/check-phase4-uat-evidence.test.mjs
corepack pnpm --filter @soji/domain test
corepack pnpm --filter @soji/web test
corepack pnpm --filter @soji/web lint
corepack pnpm --filter @soji/web typecheck
corepack pnpm --filter @soji/web build
corepack pnpm --filter @soji/web test:e2e
corepack pnpm db:schema:check
corepack pnpm db:test
corepack pnpm db:types:check
corepack pnpm docs:check
corepack pnpm phase4:uat:check
```

These checks prove local behavior only. Controlled browser data cannot prove a production
receiver delivery, provider schedule, privileged Admin row, payment, mailbox delivery, or
owner approval.

## Recorded release result

The complete local regression passed on 2026-07-28:

- Domain: 3 tests passed.
- Web: 81 files and 628 tests passed; ESLint, route types, TypeScript, and production build
  passed; all 37 generated static pages completed.
- Browser: 118 desktop/mobile tests passed, including five target widths, 200 percent text,
  reduced motion, keyboard paths, overflow, protected-content omission, and zero gated axe
  findings.
- Database: repeatable schema passed, the focused 97-test adjustment suite passed, the full
  374-test pgTAP suite passed, and generated database types matched.
- Documentation: 29 API contracts and 44 local links passed.
- Evidence: 7 validator tests and all 54 fixed evidence rows passed structure mode.

The proof is recorded in `PH4-RELEASE-REGRESSION` against implementation commit `09cbf5a`.
No deployment, production login, environment change, or production data mutation was used.

## Evidence handling

- Keep each of the 54 fixed scenario IDs exactly once.
- Automated `PASS` requires a named repository command and implementation commit.
- Owner/provider rows stay `PENDING` until observed on the canonical deployment.
- Record only a UTC timestamp and a redacted outcome. Do not record endpoints, addresses,
  identities, credentials, private file locations, provider bodies, error detail, or complete
  provider identifiers.
- Use `FAIL` for an observed mismatch and `BLOCKED` for a missing prerequisite.
- Run `corepack pnpm phase4:uat:check` after every ledger edit.
- Run `corepack pnpm phase4:uat:ready` only as the final gate.

## Consolidated owner checkpoint

This is the one authoritative list of every remaining Phase 1–4 login or owner action.
Complete it in one coordinated session when the production accounts are available; do not
repeat older phase checklists independently.

### Accounts to have available

1. Hosting project owner access for the canonical Web deployment and scheduler.
2. Production Supabase owner access, including Auth, SQL/migrations, and SMTP settings.
3. Google OAuth owner access plus two controlled mailbox providers.
4. Stripe test-mode owner access.
5. Soji canonical accounts representing Admin, editor, ordinary member, three membership
   tiers, a returning member, a product owner, and a non-owner.
6. The selected operations receiver owner access.
7. A business owner or qualified policy reviewer.

Never paste credentials into the ledger, terminal output, screenshots, issues, or commits.

### 1. Hosting project and production environment

Location: hosting project → production environment settings, deployment, and scheduler.

- Confirm the canonical site setting, public and service Supabase settings, Stripe server and
  webhook settings, durable Support action, policy approval flag, hosted Terms readiness,
  an independent cleanup secret of at least 32 random bytes, demo mode disabled, and the
  HTTPS operations receiver setting. Record no values.
- Deploy normally, then confirm the readiness endpoint reports every required production
  check true. This closes `INFRA-01-READINESS`.
- Configure the private cleanup route on the provider scheduler. Do not place the credential
  in a query parameter, evidence row, or screenshot.

### 2. Supabase, Google OAuth, and mail delivery

Locations: Supabase Dashboard → Database, Authentication → URL Configuration, Providers,
SMTP Settings; Google Cloud → OAuth client; the two controlled mailbox providers.

- Review the production migration delta, apply only the committed migrations, confirm local
  and production versions match, and confirm all billing readiness booleans. This closes
  `BILL-DB-SCHEMA-PARITY`.
- Confirm the canonical Site URL and callback allowlist, production Google provider, custom
  SMTP, sender authentication, and templates without link rewriting.
- Complete email signup/confirmation in two mailbox providers, password recovery with the
  newest message, and one Google consent round trip. Record redacted outcomes in
  `AUTH-01-SIGNUP`, `AUTH-01-RECOVERY`, and `AUTH-02-GOOGLE`.

### 3. Stripe test-mode configuration

Locations: Stripe Dashboard test mode → Product catalog, Customer Portal, Webhooks, public
business/policy settings.

- Create and verify the three locked monthly USD membership prices.
- Configure Customer Portal management, cancellation, and canonical Account return.
- Configure the signed webhook event set and confirm the production signing setting is
  installed in the hosting project.
- Configure public policy links and hosted Terms acceptance.
- For every active Soji product, verify one matching active one-time USD price and one private
  delivery asset.
- Record redacted configuration observations in `BILL-01-CATALOG`,
  `BILL-01-PORTAL-CONFIG`, `BILL-04-PRODUCT-CATALOG`, and
  `PH3-STRIPE-TERMS-LIVE`.

### 4. Canonical Soji Admin and owner inputs

Locations: canonical Soji → Admin Users, Content, Products, Office Hours, Billing, and Launch
Checklist; public Support and policy pages.

- In Users, grant and revoke a temporary Admin, confirm the audit row, confirm last-Admin
  protection, and verify Admin/editor/member workspace boundaries. Close
  `ADMIN-01-ROLE-TRANSITION` and `ADMIN-01-WORKSPACES`.
- In Office Hours, enter the approved signup and replay actions and test both with one entitled
  member. Close `PH3-OFFICE-MEMBER-SIGNUP` and `PH3-OFFICE-MEMBER-REPLAY`.
- Verify Support reaches a responding channel. Have the owner/reviewer approve Support,
  Privacy, Terms, Refund policy, and Financial disclaimer. Close `PH3-SUPPORT-RESPONSE` and
  `PH3-POLICY-OWNER-APPROVAL`.
- Verify the flagship as guest, locked member, and entitled member. Close
  `PH3-CANONICAL-CONTENT-STATES`.

### 5. Canonical billing and fulfillment matrix

Locations: canonical Pricing, Products, Account, Admin Billing; Stripe test-mode Checkout,
Portal, refunds, and disputes.

- Complete one Checkout for each membership tier; verify signed durable Account state,
  returning-customer reuse, Portal access, period-end cancellation, and the access-through
  date. Close all `BILL-03-*` rows.
- Observe signed receipt, ignored receipt, controlled failed processing plus Retry, and
  reconciliation. Confirm receipt state and processing state remain distinct. Close all
  `BILL-02-*` rows and `PH4-ADMIN-BILLING-LIVE`.
- Complete one product purchase and verify owner delivery plus signed-out and non-owner
  denial. Exercise dedicated partial refund, full refund, open dispute, won dispute, and lost
  dispute cases. Close all `BILL-04-*` rows.
- Exercise dedicated membership partial refund, full refund, open dispute, won dispute, and
  lost dispute cases. Close all `BILL-05-*` rows.
- Store only stable outcome labels and permitted redacted suffixes in the phase-specific
  ledgers; the Phase 4 row needs only the redacted state comparison.

### 6. Operations receiver and scheduler observation

Locations: selected operations receiver, hosting provider scheduler, canonical Admin Products
and Billing.

- Trigger one controlled retryable payment-processing failure. Confirm the receiver gets the
  versioned redacted event and the original application result remains unchanged. Close
  `PH4-OPS-RECEIVER-LIVE`.
- Invoke one due cleanup schedule. Confirm authorization succeeds, the response contains only
  claimed/cleaned/failed totals, and any failed item remains retryable in Admin. Close
  `PH4-CLEANUP-SCHEDULER-LIVE`.
- Do not copy receiver endpoints, request headers, file locations, error text, or complete
  provider identifiers into evidence.

### 7. Final validation

Update only rows directly observed, then run:

```sh
corepack pnpm phase1:uat:check
corepack pnpm phase2:uat:check
corepack pnpm phase3:uat:check
corepack pnpm phase4:uat:check
corepack pnpm phase4:uat:ready
```

The ready command must stay nonzero if any external row is still pending. Never promote a
row from settings inspection alone when the row requires a live outcome.

## Recovery boundaries

- Missing readiness or delivery: leave the corresponding row pending and keep Checkout closed.
- Receipt/processing mismatch, restricted-content exposure, or unauthorized download: mark the
  row `FAIL`, stop launch, and repair before another observation.
- Receiver or scheduler failure: preserve the local durable result, correct the provider
  configuration, and retry without printing credentials.
- Policy approval absent: keep policy and hosted-consent rows pending.
