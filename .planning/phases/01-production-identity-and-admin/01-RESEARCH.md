# Phase 1: Production Identity and Admin - Research

**Researched:** 2026-07-26  
**Requirements:** INFRA-01, AUTH-01, AUTH-02, ADMIN-01  
**Question:** What must be known to plan this phase without weakening Soji's existing security and production evidence?

## Executive Summary

Soji already has the hard architectural pieces for Phase 1: Supabase SSR sessions, PKCE callback exchange, safe local return paths, transactional profile bootstrap, audited first-Admin setup, final-Admin protection, independent public/service-role readiness signals, and broad automated tests.

The remaining work is a production-proof and experience-closure phase:

1. Close two application gaps: confirmed email signup does not explicitly carry the validated destination into `emailRedirectTo`, and the browser login form can surface raw Supabase error messages.
2. Refine the authentication page into the focused, premium hierarchy locked in `01-CONTEXT.md`, with Google prominent and email/password fully available.
3. Turn the current launch checklist into a reproducible, secret-free Phase 1 UAT record for canonical-domain OAuth, custom SMTP, recovery, readiness, and Admin role transitions.
4. Perform real provider-backed acceptance. Automated tests can prove contracts and failure boundaries, but they cannot prove SMTP delivery or a Google/Supabase production round trip.

No identity-provider replacement, schema redesign, or new authorization model is needed.

## Current Implementation Findings

### Existing strengths to preserve

- `apps/web/src/app/auth/callback/route.ts` exchanges PKCE codes server-side, validates the return path, uses the canonical configured origin, bootstraps the profile, and fails closed.
- `apps/web/src/lib/navigation.ts` already prevents external return URLs.
- `apps/web/src/lib/auth-recovery.ts` builds the dedicated recovery callback and suppresses provider error details.
- `apps/web/src/app/reset-password/page.tsx` gates password fields on a live Supabase recovery session.
- `apps/web/src/lib/supabase/session.ts` distinguishes a normal signed-out state from an Auth transport failure and never grants demo authority over a configured live source.
- `public.bootstrap_user_profile()` initializes profile plus member role transactionally.
- `public.bootstrap_first_admin(text)` is service-role-only, one-time, locked, audited, and does not grant a paid tier.
- `public.set_user_access_role(...)` owns later role changes and protects the final Admin.
- `/api/health/ready` exposes separate `supabasePublicOperational` and `supabaseServiceRoleOperational` checks even when Stripe makes the overall route return `503`.
- `/api/me` exposes the authoritative session source needed for UAT.

### Gap 1: confirmed signup destination

`LoginForm` calls:

- `signInWithPassword({ email, password })`
- `signUp({ email, password })`
- `signInWithOAuth({ provider: "google", options: { redirectTo } })`

Google preserves `nextPath`, but email signup does not pass `options.emailRedirectTo`. The production Site URL may therefore receive a confirmed user without the intended Account/Admin/Checkout/content destination. Planning should introduce one shared canonical callback builder and use it for both OAuth and signup confirmation.

### Gap 2: raw browser auth errors

The `handleEmailAuth` catch block currently renders `error.message`. Supabase messages can be provider-specific, inconsistent, or reveal more account state than Soji intends. Recovery already maps failures to stable Soji messages; login/signup should follow the same boundary:

- invalid sign-in → stable credential failure
- signup request failure → stable account-creation failure
- rate/provider outage → stable temporary-unavailable copy
- server/provider details → diagnostics only, never direct UI content

The client should not attempt to infer sensitive account existence from message text.

### Gap 3: signup confirmation is only a status sentence

When signup produces no session, the form sets a sentence and leaves both credential fields and all controls active. The locked UX calls for an explicit confirmation state with:

- the destination email shown only as the user's own entered value
- “check inbox/spam” guidance
- a clear way to use a different email or return to sign in
- no claim that the account is active

This can remain inside the current component; a new route is unnecessary.

### Gap 4: Phase 1 readiness is embedded in full launch readiness

`/api/health/ready` intentionally includes Stripe catalog and webhook readiness, so the overall endpoint may remain `503` until Phase 2. Phase 1 acceptance must inspect the two Supabase booleans and identity configuration independently, not redefine the full route or mark Phase 1 failed solely because Stripe is pending.

The UAT record should capture:

- `checks.siteUrl`
- `checks.supabase`
- `checks.supabaseAdmin`
- `checks.supabasePublicOperational`
- `checks.supabaseServiceRoleOperational`
- `checks.demoModeDisabled`
- `/api/me` `source: "supabase"`

It should explicitly note that full `ok: true` belongs to the later release gate.

## UI/UX Reference Findings

### Every

[Every's sign-in page](https://every.to/login) uses one centered task, a narrow form, generous negative space, a restrained dark palette, and almost no navigation distraction. This is the closest visual analogue for Soji's premium editorial positioning.

**Adopt:** single-task hierarchy, calm spacing, clear primary action.  
**Do not copy:** email-only authentication, because Soji has a required password and Google flow.

### Substack

[Substack sign-in](https://substack.com/sign-in) leads with one email decision and progressively discloses password/account creation.

**Adopt:** low initial cognitive load and explicit “first time” language.  
**Avoid:** unrelated app-promotion content and the wider product navigation complexity.

### MasterClass

[MasterClass login](https://www.masterclass.com/auth/login) places social providers ahead of email/password.

**Adopt:** a prominent Google shortcut for a professional audience.  
**Avoid:** a crowded modal, multiple unused providers, and dense legal copy inside the task flow.

### Recommended Soji composition

Use a dedicated two-part desktop composition that collapses to one column on mobile:

- Primary card: title, destination-aware reason, Google button, “or continue with email” divider, email/password fields, primary email action, sign-in/signup switch.
- Supporting panel: concise privacy/security explanation or member benefit relevant to the destination. Hide it for a configured signed-out production guest when it adds no decision value.
- Confirmation state: replace credential controls with inbox guidance and two lightweight actions.

The primary card must remain keyboard-complete and must retain existing labels or update E2E tests deliberately.

## Provider and Security Guidance

- Supabase's [Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google) requires the provider callback in Google and the application callback in Supabase's redirect allow list for PKCE.
- Supabase's [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls) makes the configured Site URL the default and requires explicit allow-list coverage for `redirectTo`.
- Supabase's [email template guide](https://supabase.com/docs/guides/auth/auth-email-templates) documents supported confirmation variables and warns that email tracking or prefetch can consume/rewrite one-time links.
- Supabase's [custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp) recommends a dedicated authentication sending domain and production abuse/rate-limit controls.
- Google's [OAuth web-server guidance](https://developers.google.com/identity/protocols/oauth2/web-server) requires exact redirect URI matching and secure storage for client secrets.

Threats that plans must explicitly mitigate:

| Threat | Existing/required mitigation |
|--------|------------------------------|
| Open redirect after Auth | Continue using `getSafeNextPath`; test external and protocol-relative values |
| Provider details/account enumeration | Stable Soji error mapping; uniform recovery acknowledgement |
| Preview host hijacks callback | Build callback from canonical `NEXT_PUBLIC_SITE_URL` |
| Confirmation link rewritten or prefetched | Supported Supabase link variables, click tracking disabled, real mailbox UAT |
| Auth succeeds but profile/roles do not initialize | Transactional `bootstrap_user_profile`, callback/API failure state |
| Unauthorized Admin promotion | Admin-authenticated RPC only, strict payload, database role check |
| Final Admin removed | `last_admin_required` database invariant plus route/UI tests |
| Bootstrap grants paid access | Assert member+admin roles and unchanged tier/entitlements |
| Secrets leaked in evidence | Store only dates, scenario IDs, boolean outcomes, and redacted provider identifiers |

## Planning Recommendations

### Plan A: Authentication experience and contract closure

Modify the login/auth helper surface and tests:

- shared canonical application callback builder
- `emailRedirectTo` for signup confirmation
- stable sign-in/signup error mapping
- Google-prominent visual hierarchy
- explicit email-confirmation state
- responsive, keyboard, and accessibility coverage

This plan is repository-autonomous.

### Plan B: Phase 1 evidence and operator runbook

Create a focused, secret-free UAT artifact and align `docs/launch-checklist.md`:

- identify already-proven steps rather than rerunning one-time bootstrap
- define exact production-domain scenarios and evidence fields
- distinguish Phase 1 Supabase readiness flags from full Stripe-dependent readiness
- define second-Admin grant/revoke/final-Admin checks
- add deterministic documentation/link validation

This plan is repository-autonomous.

### Plan C: Production provider UAT

Run the canonical-domain journeys and record outcomes:

- signup → confirm → sign in
- recovery → update password → sign in with new password
- Google → callback → intended destination
- `/api/me` Supabase source
- public/service-role readiness flags
- Admin workspace access and role-transition audit

This plan depends on active production credentials, custom SMTP, a reachable canonical deployment, two test mailboxes, and an additional UAT user. It must be marked non-autonomous if those prerequisites are unavailable. It must never put credentials or tokens in the plan or evidence.

## Validation Architecture

### Automated layers

| Layer | Scope | Command |
|-------|-------|---------|
| Focused unit/component | callback builder, error mapping, confirmation state, login/reset pages | `corepack pnpm --filter @soji/web test -- tests/env.test.ts tests/login-page.test.tsx tests/auth-callback-route.test.ts tests/auth-recovery.test.ts tests/reset-password-page.test.tsx` |
| Focused role/API | profile bootstrap, user roles, Admin launch checks, readiness | `corepack pnpm --filter @soji/web test -- tests/auth-bootstrap-route.test.ts tests/profile-bootstrap.test.ts tests/admin-user-roles-route.test.ts tests/admin-launch-checklist.test.ts tests/readiness.test.ts tests/health-routes.test.ts` |
| Browser | login keyboard flow, auth failure recovery, desktop/mobile accessibility | `corepack pnpm --filter @soji/web test:e2e -- --grep "login|authentication|accessibility"` |
| Database | bootstrap, grants, role audit, final Admin protection, readiness privileges | `corepack pnpm test:db` |
| Static contract | strict TypeScript and lint | `corepack pnpm --filter @soji/web typecheck && corepack pnpm --filter @soji/web lint` |
| Production artifact | Next.js build and standalone secret scan | `corepack pnpm --filter @soji/web build && corepack pnpm deploy:check` |
| Documentation | link and API documentation integrity | `corepack pnpm docs:check` |

### Provider-backed UAT

Automated tests must not be used as evidence for SMTP delivery or Google consent/callback. Record each real journey with:

- UTC timestamp
- canonical origin
- anonymized test-account label
- mailbox provider category
- expected destination
- observed destination/status
- readiness booleans
- pass/fail and non-sensitive notes

### Sampling cadence

- Run focused tests after each authentication or Admin change.
- Run the entire Web unit/route suite after the Phase 1 code plan.
- Run desktop and mobile browser tests after visual changes.
- Run database tests if any schema/declarative SQL is modified; otherwise verify existing migration parity without changing deployed migrations.
- Run typecheck, lint, build, deploy artifact check, docs check, and full E2E before Phase 1 closeout.

### Manual-only assertions

- SPF/DKIM/DMARC and link-tracking configuration
- delivery to two mailbox providers
- Google consent and canonical redirect
- Supabase dashboard Site URL/redirect allow list
- first-Admin historical audit row in the production database
- second-Admin grant/revoke and final-Admin rejection in production UAT

## Risks and Avoidances

- **Do not make full `/api/health/ready` success a Phase 1 prerequisite.** Stripe belongs to Phase 2; inspect the Phase 1 booleans.
- **Do not rerun `publisher-setup.sql`.** The correct production result after the first bootstrap is `first_admin_already_exists`.
- **Do not edit deployed migrations.** Any real schema correction must be a forward migration and would trigger a blocking push task.
- **Do not store secrets in Markdown, screenshots, test fixtures, or terminal output.**
- **Do not broaden identity scope.** MFA, passkeys, Apple/Facebook, magic links, and organization SSO are future capabilities.
- **Do not equate a UI redirect with an authenticated session.** Verify `/api/me`, profile/roles, and readiness evidence.

## RESEARCH COMPLETE

Phase 1 can be planned as two autonomous repository plans plus one credential-backed UAT plan. The current architecture is sufficient; implementation should close the email-confirmation redirect and stable-error gaps, refine the existing UI, and make production evidence reproducible.
