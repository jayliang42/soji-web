# Phase 1: Production Identity and Admin - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning
**Mode:** Autonomous defaults selected by Codex under the user's instruction to continue all phases without Claude

<domain>
## Phase Boundary

This phase proves Soji's existing Supabase identity and publisher-control implementation against the real production environment. It covers reviewed database migrations and launch data, email/password signup and recovery through production SMTP, Google OAuth on the canonical production domain, the one-time first-Admin bootstrap evidence, and audited role management in `/admin`.

It does not redesign authorization, add new identity providers, introduce MFA/passkeys, change billing, or expand the Admin feature set. The production launch checklist already records that the Supabase project, migrations, local Google flow, and first Admin were completed; planning should preserve that evidence, verify it where required, and focus implementation on remaining production-domain UAT and customer-facing identity polish.

</domain>

<decisions>
## Implementation Decisions

### Authentication Entry and Visual Hierarchy
- **D-01:** Keep authentication on a dedicated, editorial full-page route. Do not turn it into a modal over public content.
- **D-02:** Present Google as the prominent low-friction shortcut while retaining complete email/password signup and sign-in.
- **D-03:** Keep sign-in and account creation as explicit modes in one authentication component so users can switch without losing entered context.
- **D-04:** Preserve the existing validated `nextPath` through email and Google authentication. When no destination is supplied, successful authentication should land on `/account`.
- **D-05:** Destination-aware copy remains part of the experience: users heading to Admin, Account, Checkout, or protected content should understand why they were asked to sign in.

### Signup Confirmation and Password Recovery
- **D-06:** When signup requires email confirmation, replace the active form state with clear inbox guidance rather than implying that the user is already signed in.
- **D-07:** Password-recovery requests must use the same privacy-safe acknowledgement whether or not an account matches the email.
- **D-08:** Valid recovery links use the dedicated `/reset-password` route. Expired, malformed, or already-used links show a clear failure state and a direct path to request a new link.
- **D-09:** Production email templates use Supabase-supported confirmation URLs. Email click tracking must be disabled so one-time links are not rewritten.
- **D-10:** Auth email acceptance includes sender-domain configuration and delivery checks; UI copy should set realistic expectations without exposing provider internals.

### Production Identity Acceptance Evidence
- **D-11:** Only a complete authentication round trip on the canonical HTTPS production domain counts as production OAuth/recovery evidence. Localhost and preview deployments are preliminary checks.
- **D-12:** Signup confirmation and password recovery must be delivered successfully to at least two different mailbox providers.
- **D-13:** Provider-backed UAT results must be recorded with a date, environment, scenario, and pass/fail outcome. Never store passwords, tokens, secrets, raw cookies, or sensitive dashboard screenshots.
- **D-14:** Browser success alone is insufficient. Acceptance also requires `/api/me` to report `source: "supabase"`, demo mode to be disabled, and both public and service-role readiness probes to pass.
- **D-15:** Preview or proxy hosts must not influence OAuth or recovery destinations; `NEXT_PUBLIC_SITE_URL` remains the canonical redirect authority.

### First Admin and Operational Handoff
- **D-16:** Treat the completed first-Admin bootstrap recorded in `docs/launch-checklist.md` as carried-forward evidence. Do not rerun the one-time bootstrap merely to reproduce proof.
- **D-17:** Bootstrap evidence must show `member + admin`, no paid membership tier grant, and a `role_change_events` entry whose source is `first_admin_bootstrap`.
- **D-18:** All later editor/Admin changes occur through the Admin Users workspace and its audited RPC. Direct `user_roles` writes and repeated bootstrap SQL are not operational procedures.
- **D-19:** UAT must exercise granting and removing a second Admin account and must prove that the final Admin cannot be removed. The owner decides whether a second Admin remains in production after acceptance.
- **D-20:** `/admin` acceptance covers every role-appropriate workspace: editor-capable areas for editors and admins, billing/user-role operations for admins only, and clear access-denied states for members.

### Codex Discretion
- Exact spacing, type scale, responsive composition, microcopy, and component extraction may be refined during implementation while preserving the decisions above and Soji's editorial visual language.
- Codex may choose whether dated UAT evidence is appended to `docs/launch-checklist.md` or stored in a focused Phase 1 UAT document, provided it is secret-free and linked from the checklist.
- Codex may add or strengthen automated contract and browser tests where they reduce risk, but real provider round trips remain explicit manual/credential-backed UAT.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope and Phase Contract
- `.planning/PROJECT.md` — product value, launch constraints, validated baseline, and active production work.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements `INFRA-01`, `AUTH-01`, `AUTH-02`, and `ADMIN-01`.
- `.planning/ROADMAP.md` — Phase 1 goal, fixed boundary, and success criteria.
- `.planning/STATE.md` — current position, accumulated decisions, dirty-worktree warning, and external credential blockers.

### Production Runbook and Data Setup
- `docs/launch-checklist.md` §§2–5 — production variables, Supabase status, Auth/SMTP work, and completed first-Admin evidence.
- `supabase/README.md` — migration workflow, RLS model, local verification, and first-Admin operating procedure.
- `supabase/publisher-setup.sql` — safe placeholder invocation for the one-time bootstrap RPC.
- `supabase/migrations/20260714110000_audited_first_admin_bootstrap.sql` — authoritative first-Admin invariants and grants.
- `supabase/schema.sql` — declarative database source of truth, including role and readiness RPCs.

### Existing Identity and Admin Implementation
- `apps/web/src/app/login/page.tsx` — destination-aware authentication page and callback error states.
- `apps/web/src/components/login-form.tsx` — email/password, signup, Google OAuth, recovery, and profile bootstrap entry points.
- `apps/web/src/app/auth/callback/route.ts` — PKCE exchange, canonical redirects, profile bootstrap, and fail-closed outcomes.
- `apps/web/src/app/reset-password/page.tsx` — recovery-session gate and invalid-link state.
- `apps/web/src/components/password-reset-form.tsx` — new-password validation and completion behavior.
- `apps/web/src/lib/auth-recovery.ts` — recovery redirect and password-update contract.
- `apps/web/src/lib/login-copy.ts` — destination-aware authentication messaging.
- `apps/web/src/lib/navigation.ts` — safe local return-path validation.
- `apps/web/src/lib/supabase/session.ts` — authoritative session/profile/role snapshot and demo/live separation.
- `apps/web/src/app/api/auth/bootstrap/route.ts` — authenticated member-profile bootstrap boundary.
- `apps/web/src/app/admin/page.tsx` — role-aware Admin entry and workspace navigation.
- `apps/web/src/components/admin-users.tsx` — audited role-management interface.
- `apps/web/src/lib/admin-launch-checklist.ts` — Admin-facing readiness representation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LoginForm`: already owns both auth modes, Google OAuth, recovery initiation, pending states, and safe post-auth navigation.
- `getLoginPageCopy`: already adapts the page explanation to Admin, Account, Checkout, and protected-content destinations.
- `PasswordResetForm` and `LegacyRecoveryHandler`: provide a dedicated reset flow and backward-compatible recovery handling.
- `getSessionSnapshot`: provides one fail-closed source for user, roles, entitlements, transport failures, and demo/live provenance.
- `AdminUsers`: already exposes bounded user search and audited role changes with last-Admin error handling.
- `AdminLaunchChecklist`: can surface production configuration and readiness without exposing secrets.

### Established Patterns
- Canonical redirect origins come from `NEXT_PUBLIC_SITE_URL`; proxy/browser origins are not trusted for production callbacks.
- `getSafeNextPath` prevents open redirects and is reused by login and callback flows.
- Live Supabase errors never fall back to demo authority; restricted access fails closed with stable customer-facing states.
- Browser clients can bootstrap only their own profile; service-role and role-management RPCs remain server/database boundaries.
- First Admin and later role changes are distinct audited paths protected by a shared database lock and final-Admin invariant.
- External provider errors are logged operationally while UI/API consumers receive stable, non-sensitive reasons.

### Integration Points
- Supabase Dashboard URL configuration, Google provider settings, SMTP settings, and email templates must match the canonical Web callback routes.
- `/api/me`, `/api/health/ready`, `/account`, `/admin`, and the Admin Launch Checklist provide complementary acceptance signals.
- `apps/web/.env.example` documents required values but production secrets must remain runtime-only.
- Database migration history and `schema.sql` must stay aligned; deployed migrations are immutable and any correction is forward-only.

</code_context>

<specifics>
## Specific Ideas

- Use [Every's focused sign-in page](https://every.to/login) as the strongest visual reference: one calm task, generous spacing, and minimal distraction.
- Borrow [Substack's email-first clarity](https://substack.com/sign-in) for progressive disclosure, but avoid unrelated app-promotion content and navigation complexity.
- Use [MasterClass's login surface](https://www.masterclass.com/auth/login) as evidence that provider shortcuts can be prominent, while avoiding its crowded multi-provider modal for Soji's smaller identity scope.
- Follow the official Supabase guidance for [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
- The desired feeling is premium and trustworthy, not “enterprise SSO portal”: clear hierarchy, restrained color, explicit outcomes, and no ambiguous loading or success state.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within the Phase 1 boundary.

</deferred>

---

*Phase: 01-production-identity-and-admin*
*Context gathered: 2026-07-26*
