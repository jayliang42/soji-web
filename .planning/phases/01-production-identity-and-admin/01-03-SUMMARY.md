---
phase: 01-production-identity-and-admin
plan: "03"
status: human_needed
subsystem: auth
tags: [supabase, vercel, oauth, smtp, production-uat]
requires:
  - phase: 01-01
    provides: Canonical production auth flows and safe failure states
  - phase: 01-02
    provides: Secret-free production UAT runbook and evidence validator
provides:
  - Canonical production deployment at https://soji-web.vercel.app
  - Production Supabase Site URL and controlled callback allow list
  - Migration parity, readiness, provider, and first-Admin aggregate evidence
  - Explicit human UAT boundary without fabricated PASS results
affects: [billing-uat, launch-readiness, production-deployment]
tech-stack:
  added: []
  patterns:
    - Production evidence stores only redacted labels, versions, counts, and booleans
    - External identity actions remain human-gated
key-files:
  created:
    - apps/web/vercel.json
    - .vercelignore
  modified:
    - .planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md
key-decisions:
  - "Created a dedicated soji-web Vercel project instead of overwriting the unrelated soji-official project."
  - "Deferred external mailbox, SMTP, Google-consent, and live role-transition checks rather than auto-approving them."
patterns-established:
  - "Canonical redirect authority: NEXT_PUBLIC_SITE_URL and the Supabase allow list both use https://soji-web.vercel.app."
requirements-completed: []
requirements-pending: [INFRA-01, AUTH-01, AUTH-02, ADMIN-01]
duration: 1h
checkpointed: 2026-07-26
---

# Phase 1 Plan 03: Production Identity and Admin UAT Summary

**A live Vercel/Supabase production surface now has verified infrastructure and first-Admin evidence, while external identity and role-transition checks remain explicitly human-gated.**

## Performance

- **Duration:** 1h
- **Checkpointed:** 2026-07-26
- **Automatable slices completed:** 3
- **Files created or modified:** 4

## Accomplishments

- Deployed the current Web application to `https://soji-web.vercel.app` without replacing the unrelated existing Vercel project.
- Updated Supabase Auth to use the canonical production Site URL and allow production plus controlled local callback URLs.
- Verified 21 local and 21 production migration versions match.
- Verified the production app is alive, Demo mode is disabled, the public Supabase path is operational, and `/api/me` reports the Supabase source.
- Confirmed email signup, email confirmation, and Google provider switches are enabled.
- Confirmed the one-time first-Admin event exists exactly once and its target retains member plus Admin roles, free tier, and no paid subscription.
- Ran 22 production accessibility checks and 30 applicable production responsive/auth/metadata/security checks successfully.

## Task Commits

1. **Initial production UAT checkpoint** — `f6c72b7`
2. **Canonical Vercel project configuration** — `0ff170d`
3. **Redacted production deployment evidence** — `741ee9c`

## Files Created/Modified

- `.vercelignore` — excludes secrets, local outputs, planning data, and the mobile app from Vercel uploads.
- `apps/web/vercel.json` — declares the Next.js project and daily cleanup cron.
- `apps/web/.gitignore` — excludes the local Vercel link directory.
- `.planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md` — records only public origins, versions, counts, booleans, and redacted labels.

## Decisions Made

- Used the new `soji-web` Vercel project because `soji-official` serves an unrelated repository and domain.
- Kept `SUPABASE_SERVICE_ROLE_KEY` out of Vercel until the owner explicitly authorizes placing the production server secret in that project.
- Did not simulate SMTP delivery, mailbox link clicks, Google consent, or Admin role transitions; those remain authoritative human UAT items.

## Deviations from Plan

### Human-gated closeout

Plan 03 cannot truthfully reach its all-PASS acceptance criteria yet. Custom SMTP is not configured, the Vercel runtime lacks the Supabase service-role secret, and the external mailbox/Google plus live Admin role-transition journeys require controlled identities. The plan is therefore checkpointed as `human_needed`, not marked complete.

## Issues Encountered

- Vercel initially blocked deployment because the repository commit email did not map to GitHub. A repository-local GitHub anonymous email fixed the next deployment without rewriting history.
- Vercel initially built from the monorepo root. Setting the project Root Directory to `apps/web` while including workspace dependencies produced a successful Next.js build.
- Production readiness remains `503` because the Phase 1 service-role checks and Phase 2 Stripe checks are not all configured.
- Supabase reports default email delivery; custom SMTP and sender-domain DNS proof are still required.

## User Setup Required

The remaining actions are consolidated rather than requested piecemeal:

- Approve installing the existing production Supabase service-role secret in the dedicated `soji-web` Vercel project.
- Configure custom SMTP and the sending domain's SPF/DKIM/DMARC records.
- Complete two mailbox-provider confirmation journeys and one recovery journey.
- Complete one Google consent journey.
- Use the current Admin identity for the temporary Admin grant/revoke and role-boundary checks.

## Next Phase Readiness

Phase 2 planning, local billing implementation, deterministic tests, and non-secret catalog validation can continue. Live Stripe checkout/webhook fulfillment will remain a production UAT checkpoint until the owner authorizes the Stripe/Vercel configuration and provider-side setup.

## Self-Check: PARTIAL

- Production deployment and automated evidence are present and safety-validated.
- Human-required scenarios remain PENDING or BLOCKED in the evidence file.
- `corepack pnpm phase1:uat:check` passes.
- `corepack pnpm phase1:uat:ready` intentionally remains failing.

---
*Phase: 01-production-identity-and-admin*
*Checkpointed: 2026-07-26*
