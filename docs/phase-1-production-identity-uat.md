# Phase 1 Production Identity and Admin UAT

This runbook closes `INFRA-01`, `AUTH-01`, `AUTH-02`, and `ADMIN-01` against
Soji's canonical production environment.

Use it with the secret-free
[Phase 1 evidence record](../.planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md).
Repository tests are necessary but do not substitute for live SMTP, Google, Supabase,
or Admin observations.

## Safety rules

- Use only the canonical HTTPS deployment: `https://<canonical-origin>`.
- Refer to test identities as `mailbox-a`, `mailbox-b`, `google-uat`, and
  `temporary-admin`.
- Never copy an account address, password, one-time link, OAuth code, credential,
  browser storage value, request header, or dashboard secret into the evidence file.
- Record UTC date, redacted environment label, expected result, observed result,
  and status only.
- Use screenshots only when every identity and sensitive value is fully redacted.
- Do not rewrite any deployed migration.
- Do not include the production seed in a migration push during this phase.
- Do not rerun the first-Admin bootstrap after an Admin already exists.
- Mark a row `PASS` only from an observed result; otherwise use `FAIL` or `BLOCKED`.

Run the structure and safety gate after every evidence edit:

```bash
corepack pnpm phase1:uat:check
```

Run the completion gate only after all eight scenarios were observed:

```bash
corepack pnpm phase1:uat:ready
```

## Prerequisites

- The Supabase CLI is authenticated and linked to the existing production project.
- The canonical Web deployment is reachable over HTTPS.
- Production Web variables point to that canonical origin and production Supabase.
- Demo mode is disabled in the production runtime.
- Google is enabled in Supabase and has the exact Supabase provider callback.
- Supabase Site URL and redirect allow list contain the canonical Web callback.
- Custom SMTP uses the approved authentication sending domain.
- Sender-domain SPF and DKIM are valid; the deployment owner has selected a DMARC policy.
- Email click tracking or URL rewriting is disabled for confirmation and recovery.
- Two UAT mailboxes on different providers and one Google UAT identity are available.
- A current production Admin and a separate member UAT identity are available.

## Scenario INFRA-01-MIGRATIONS

Purpose: prove the reviewed local migration history matches production.

1. From the repository root, list the linked project's migration history:

   ```bash
   corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 migration list
   ```

2. Review the local and remote version columns. Record versions only, never connection
   details.
3. Preview forward changes:

   ```bash
   corepack pnpm --config.registry=https://registry.npmjs.org dlx supabase@2.109.1 db push --dry-run
   ```

4. If a forward migration is pending, inspect that exact file for destructive SQL.
5. Apply only reviewed forward migrations with `db push`.
6. Do not add the seed flag and do not alter an already deployed file.
7. Rerun the migration list.

Expected result: local and production migration version lists match, with no seed or
destructive operation applied.

Recovery: if an unexpected migration appears, mark the scenario `BLOCKED`, stop, and
review project linkage and migration history before any push.

## Scenario INFRA-01-READINESS

Purpose: prove the production identity data plane and privileged readiness probe work.

1. Request `https://<canonical-origin>/api/health/ready`.
2. The HTTP response may be `503` until Phase 2 completes Stripe configuration.
3. Inspect the named `checks` values independently.
4. Require all six values below to be `true`:

   - `demoModeDisabled`
   - `siteUrl`
   - `supabase`
   - `supabaseAdmin`
   - `supabasePublicOperational`
   - `supabaseServiceRoleOperational`

5. Request `https://<canonical-origin>/api/me`.
6. Require `source` to be `supabase`. A signed-out `user` value is acceptable for this
   preflight.

Expected result: the six Phase 1 checks are true and the session API names Supabase as
its source. Stripe fields and the route's overall `ok` do not decide Phase 1.

Recovery: if a named value is false, inspect only the matching runtime configuration
or readiness path. Do not weaken the endpoint or enable demo fallback.

## Scenario AUTH-01-SIGNUP

Purpose: prove custom SMTP confirmation delivery and canonical callback behavior.

1. Open `https://<canonical-origin>/login?next=/account`.
2. Select `Create account`.
3. Register `mailbox-a`.
4. Confirm that Soji shows `Check your inbox` and does not claim an active session.
5. Repeat with `mailbox-b` on a different mailbox provider.
6. Confirm both messages are delivered by the configured sending domain.
7. Confirm neither message link was rewritten by click tracking.
8. Open the newest confirmation link for each identity.
9. Confirm each returns through the canonical `/auth/callback` and reaches `/account`.
10. Sign in again and verify `/api/me` reports the Supabase source.

Expected result: both providers receive a usable confirmation and both identities
complete a canonical production round trip.

Recovery: if delivery fails, keep the scenario non-PASS and review SMTP reputation,
sender authentication, rate limits, spam placement, and URL rewriting.

## Scenario AUTH-01-RECOVERY

Purpose: prove the privacy-safe recovery request and new-password session.

1. On the canonical login page, enter the label selected for recovery.
2. Choose `Forgot password?`.
3. Confirm the UI always displays:
   `If an account matches that email, a password reset link is on its way.`
4. Open only the newest recovery message.
5. Confirm it returns through the canonical recovery callback to `/reset-password`.
6. Set a new password without recording it.
7. Confirm the page shows `Password updated` and `Continue to your account`.
8. Sign out, then sign in with the new password.
9. Confirm `/api/me` reports the Supabase source.
10. Reopen the used link and confirm the explicit invalid-link state.

Expected result: recovery works without account enumeration, the new password signs in,
and an old link cannot be reused.

Recovery: request a new message and use only the newest link. A preview/local result
does not count.

## Scenario AUTH-02-GOOGLE

Purpose: prove exact Google/Supabase configuration and safe destination preservation.

1. Start from `https://<canonical-origin>/login?next=/admin`.
2. Choose `Continue with Google`.
3. Confirm the provider journey uses the production Supabase project.
4. Complete consent with `google-uat`.
5. Confirm the browser returns through the canonical `/auth/callback`.
6. Confirm the intended `/admin` destination is preserved.
7. If the identity lacks an Admin role, a role denial is expected; an external or
   preview redirect is never acceptable.
8. Confirm `/api/me` reports the Supabase source.

Expected result: the exact canonical callback completes, the safe local destination is
preserved, and no preview host influences the redirect.

Recovery: compare the Google authorized callback, Supabase provider configuration,
Supabase Site URL, and redirect allow list exactly. Do not add wildcard production hosts.

## Scenario ADMIN-01-BOOTSTRAP

Purpose: carry forward and inspect the already completed one-time bootstrap.

1. Do not run `supabase/publisher-setup.sql`.
2. Inspect the existing first-Admin identity and its audit record.
3. Confirm it has both `member` and `admin`.
4. Confirm no paid membership tier or entitlement was granted by bootstrap.
5. Confirm the role-change event source is `first_admin_bootstrap`.

Expected result: historical evidence shows the one-time invariant without recreating or
mutating it.

Recovery: if the evidence is missing, mark the scenario `BLOCKED` and investigate the
existing audit trail. Never manufacture a second first-Admin event.

## Scenario ADMIN-01-ROLE-TRANSITION

Purpose: prove all later role changes are audited and the final Admin is protected.

1. Sign in as the current Admin and open `/admin?view=users`.
2. Find `temporary-admin` using the bounded Users search.
3. Grant Admin through the Users workspace.
4. Confirm the new role and its role-change audit event.
5. Verify the dedicated final-Admin rejection setup returns HTTP `409` and displays:
   `Keep at least one admin account before changing this role.`
6. Restore the temporary identity to its intended non-Admin role through Users.
7. Confirm the revoke event is also audited.

Expected result: grant and revoke are audited, the last Admin cannot be removed, and no
direct table edit is used.

Recovery: keep at least one verified Admin at all times. If role state is ambiguous,
stop before another mutation and reconcile the current role/audit view.

## Scenario ADMIN-01-WORKSPACES

Purpose: prove role-appropriate access across the publisher control plane.

As a live Admin, verify:

- Overview and production source/readiness labels.
- Content management.
- Products and private delivery controls.
- Office hours.
- Users search and role controls.
- Billing event and recovery controls.

Then verify:

- An editor can access editorial workspaces but cannot access Billing or Users controls.
- A member cannot access publisher workspaces.
- No unavailable live query silently falls back to demo authority.

Expected result: every workspace is reachable only by its intended role, and source
badges distinguish live, demo, and unavailable states.

Recovery: if any boundary is wrong, mark `FAIL`, preserve the observed role label, and
stop role mutation until the application/database policy is reconciled.

## Evidence closeout

1. Update only the matching scenario row after each observation.
2. Use UTC dates and redacted labels.
3. Keep expected and observed summaries short and boolean-oriented.
4. Run the structure/safety gate.
5. When all eight rows say `PASS`, run the ready gate.
6. Update `docs/launch-checklist.md` only for results that now have PASS evidence.
7. Commit the evidence and launch checklist together with the Plan 03 summary.

