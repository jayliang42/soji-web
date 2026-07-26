---
phase: 01-production-identity-and-admin
plan: "01"
subsystem: auth
tags: [supabase, oauth, pkce, react, playwright, accessibility]
requires:
  - phase: existing-product
    provides: "Supabase SSR identity, callback exchange, safe navigation, and member profile bootstrap"
provides:
  - "Shared canonical Auth callback construction for signup, OAuth, and recovery"
  - "Provider-safe login, signup, recovery, and password-update states"
  - "Responsive provider-first identity UI with keyboard and WCAG regression coverage"
affects: [01-production-identity-and-admin, production-uat, launch-readiness]
tech-stack:
  added: []
  patterns:
    - "Build every browser Auth callback from the configured canonical origin and a validated local destination"
    - "Map provider failures to stable operation-specific public copy"
key-files:
  created:
    - apps/web/src/lib/auth-redirect.ts
    - apps/web/tests/auth-redirect.test.ts
    - apps/web/tests/auth-errors.test.ts
  modified:
    - apps/web/src/components/login-form.tsx
    - apps/web/src/app/login/page.tsx
    - apps/web/src/app/reset-password/page.tsx
    - apps/web/src/components/password-reset-form.tsx
    - apps/web/e2e/public-pages.spec.ts
key-decisions:
  - "Use one getAuthCallbackUrl helper for confirmation, Google OAuth, and recovery so preview hosts cannot influence production redirects."
  - "Treat provider messages as diagnostic-only data and expose fixed Soji copy at the browser boundary."
  - "Keep Google first while retaining explicit email sign-in and account-creation modes in one dedicated page."
patterns-established:
  - "Auth callbacks: canonical origin plus getSafeNextPath, never browser/proxy host composition."
  - "Auth UI: operation-specific pending labels, disabled competing controls, and a single status/alert region."
requirements-completed:
  - AUTH-01
  - AUTH-02
duration: 7min
completed: 2026-07-26
---

# Phase 1 Plan 1: Production Auth Experience Summary

**Canonical signup/OAuth/recovery redirects, privacy-safe provider failures, and a responsive Google-first identity experience protected by Vitest, Playwright, and axe**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-26T08:21:00Z
- **Completed:** 2026-07-26T08:28:00Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Unified email confirmation, Google OAuth, and password recovery around one safe canonical callback builder.
- Replaced raw Supabase/Google messages with stable sign-in, signup, and provider failure copy.
- Added the explicit inbox confirmation state, operation-specific pending labels, and exact recovery/reset outcomes from the UI specification.
- Verified desktop/mobile hierarchy, mode switching, keyboard submission, 44px actions, horizontal overflow, and serious/critical axe violations.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add canonical Auth redirect and stable failure contracts** — `6c39c79`
2. **Task 2: Refine the login, confirmation, and reset interaction states** — `6ae74d9`
3. **Task 3: Lock the identity experience with component and browser tests** — `1140645`

## Files Created/Modified

- `apps/web/src/lib/auth-redirect.ts` — canonical callback URL builder with safe destination normalization.
- `apps/web/src/lib/auth-recovery.ts` — recovery callbacks delegated to the shared builder.
- `apps/web/src/lib/supabase/auth-errors.ts` — stable public Auth failure messages.
- `apps/web/src/components/login-form.tsx` — provider-first sign-in/signup, explicit confirmation, recovery, and pending states.
- `apps/web/src/app/login/page.tsx` — dedicated responsive identity composition and security context.
- `apps/web/src/app/reset-password/page.tsx` — exact invalid/expired-link recovery state.
- `apps/web/src/components/password-reset-form.tsx` — exact successful password-update state.
- `apps/web/tests/auth-redirect.test.ts` — canonical origin and open-redirect regression tests.
- `apps/web/tests/auth-errors.test.ts` — provider-detail suppression tests.
- `apps/web/tests/login-page.test.tsx` — hierarchy, callback wiring, and confirmation-copy contracts.
- `apps/web/tests/reset-password-page.test.tsx` — invalid/valid reset contracts.
- `apps/web/e2e/public-pages.spec.ts` — responsive, keyboard, ordering, target-size, and recovery-action coverage.

## Decisions Made

- The supporting identity panel contains security/account continuity context only; it does not add competing marketing actions.
- Signup without a session replaces credentials with inbox guidance and never bootstraps or redirects before callback completion.
- The 14px divider copy uses a stronger foreground opacity after axe measured the original value below WCAG AA.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale assertions before Task 3**
- **Found during:** Task 2 verification
- **Issue:** Existing tests expected superseded CTA and invalid-link copy, so the Task 2 gate could not reflect the approved UI-SPEC.
- **Fix:** Moved the relevant expectation updates forward, then completed their broader Task 3 coverage.
- **Files modified:** `apps/web/tests/login-page.test.tsx`, `apps/web/tests/reset-password-page.test.tsx`
- **Verification:** 432/432 Vitest assertions passed.
- **Committed in:** `1140645`

**2. [Rule 1 - Bug] Raised divider text contrast**
- **Found during:** Task 3 Playwright/axe verification
- **Issue:** Axe measured the divider at 4.36:1, below the required 4.5:1.
- **Fix:** Increased the divider foreground opacity and reran both browser projects.
- **Files modified:** `apps/web/src/components/login-form.tsx`
- **Verification:** 38/38 focused desktop/mobile Playwright tests passed with no serious or critical axe violation on login/reset.
- **Committed in:** `1140645`

---

**Total deviations:** 2 auto-fixed bugs.  
**Impact on plan:** Both fixes were required to satisfy the locked copy and accessibility contracts; scope did not expand.

## Issues Encountered

- The sandbox initially blocked Playwright from listening on port 3100; the same test command passed with approved local-server permission.
- The plan's documented `pnpm ... test:e2e -- --grep` form inserted an extra separator for this script; execution used the equivalent working `pnpm ... test:e2e --grep` form.

## User Setup Required

None for this repository plan. Provider-backed production setup and UAT remain in Plan 03.

## Next Phase Readiness

- Application-level AUTH-01/AUTH-02 contracts are ready for canonical-domain SMTP and Google provider UAT.
- Plan 02 can create the secret-safe evidence/runbook gate before any production actions.

## Self-Check: PASSED

- 432/432 Web Vitest assertions passed.
- 38/38 focused Playwright tests passed across desktop and mobile.
- Typecheck and lint passed.
- All created key files exist and all three task commits are present.

---
*Phase: 01-production-identity-and-admin*
*Completed: 2026-07-26*
