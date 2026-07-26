# Phase 01 — Existing Pattern Map

**Mapped:** 2026-07-26  
**Inputs:** `01-CONTEXT.md`, `01-RESEARCH.md`, `01-UI-SPEC.md`

## Purpose

Map Phase 1 target files to the closest existing Soji patterns so execution extends current contracts instead of introducing a parallel authentication or evidence system.

## Target-to-Analog Map

| Target file/responsibility | Role and data flow | Closest existing analog | Pattern to preserve |
|----------------------------|--------------------|-------------------------|---------------------|
| `apps/web/src/lib/auth-redirect.ts` (new) | Pure helper: canonical origin + validated local destination → application callback URL | `apps/web/src/lib/auth-recovery.ts`, `apps/web/src/lib/navigation.ts`, `apps/web/src/lib/env.ts` | Keep URL construction pure/testable; call `getSafeNextPath`; return a canonical absolute URL or a stable unavailable result |
| `apps/web/src/lib/supabase/auth-errors.ts` | Dynamic Supabase error → stable customer-facing auth outcome | `apps/web/src/lib/auth-recovery.ts`, `apps/web/src/lib/publisher.ts` | Provider/database details stay behind the boundary; UI receives small stable reasons/copy |
| `apps/web/src/components/login-form.tsx` | User action → Supabase browser Auth → profile bootstrap/callback → local navigation | Current `LoginForm`, `ProfileSetupRetry` | One `useTransition` boundary, operation-specific pending state, no parallel auth requests, recoverable status adjacent to action |
| `apps/web/src/app/login/page.tsx` | Server session/config snapshot → destination-aware page composition | Current login page, `SectionShell`, `DataUnavailable` | Server page owns redirect/config/error framing; client form owns interactive auth states |
| `apps/web/src/components/password-reset-form.tsx` | Recovery-session password input → stable update outcome | Current form, `ProfileSetupRetry` | Validate locally, suppress provider details, show explicit success panel and next action |
| `apps/web/tests/auth-redirect.test.ts` (new) | Pure callback contract tests | `apps/web/tests/auth-recovery.test.ts`, `apps/web/tests/navigation.test.ts`, `apps/web/tests/env.test.ts` | Table-driven exact URL assertions including malicious `next` values and preview-host cases |
| `apps/web/tests/auth-errors.test.ts` (new) | Stable mapping contract | `apps/web/tests/auth-recovery.test.ts`, `apps/web/tests/profile-bootstrap.test.ts` | Assert stable public output and absence of provider detail |
| `apps/web/tests/login-page.test.tsx` | Server-rendered hierarchy and error states | Existing file | Render page with mocked session/config and assert exact headings/CTA order/state copy |
| `apps/web/e2e/public-pages.spec.ts` | Real browser layout, keyboard, responsive, axe | Existing authentication and accessibility tests | Use visible labels/roles, deterministic demo configuration, desktop/mobile projects, no provider network dependency |
| `docs/phase-1-production-identity-uat.md` (new) | Operator action → redacted evidence → requirement verdict | `docs/launch-checklist.md`, `docs/deployment.md` | Exact steps and pass criteria, checkbox/status format, no secrets or raw identifiers |
| `docs/launch-checklist.md` | Milestone source of truth and current production status | Current sections 2–5 | Preserve completed historical facts; link focused UAT evidence; do not mark manual journeys complete without real evidence |
| `.planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md` (execution output if provider access exists) | Dated production results only | Phase context validation contract | Store UTC date, scenario label, boolean/result, and redacted note; never credentials, email addresses, tokens, or cookies |

## Reusable Code Contracts

### Safe destination normalization

`apps/web/src/lib/navigation.ts` is the only return-path authority. New callback helpers must call it rather than reproduce its grammar.

Expected flow:

```text
untrusted next parameter
  → getSafeNextPath(next)
  → canonical NEXT_PUBLIC_SITE_URL origin
  → /auth/callback?next=<encoded local path>
```

The callback route repeats safe-path validation because provider round trips are an independent trust boundary.

### Stable error boundary

Existing server code consistently follows:

```text
provider/database error
  → reportOperationalError(event, error, non-sensitive context)
  → stable reason/status returned to UI or API
```

Client Auth cannot safely forward logs with credentials or provider payloads. It should map recognized Supabase codes/statuses to a small public outcome and use one temporary-unavailable fallback. It must never render `error.message`.

### Async client state

`ProfileSetupRetry` demonstrates the preferred client pattern:

- clear prior status before work
- `useTransition` for pending state
- disable the initiating action
- stable local error copy
- navigate only after the server boundary confirms success

`LoginForm` should extend this into an explicit operation state:

```text
idle | email_sign_in | email_sign_up | google | recovery
```

One operation at a time; pending copy derives from the current operation.

### Status semantics

- `role="alert"`: invalid credentials, callback failure, unavailable Auth, invalid reset link.
- `role="status"`: recovery acknowledgement, confirmation-required state, password updated.
- Neutral unavailable surfaces reuse `border-clay/30 bg-accent-muted`.
- Success surfaces reuse `border-sage bg-success-muted`.

### Role changes

Later Admin changes must keep the current layered boundary:

```text
Admin Users UI
  → PATCH /api/admin/users/roles (strict Zod payload)
  → getAdminContext()
  → set_user_access_role RPC
  → role_change_events audit + final-Admin invariant
```

No plan should add direct `user_roles` writes or provider-metadata role storage.

## Test Style

### Pure helper tests

Use Vitest exact-value tests like `auth-recovery.test.ts`. Each security boundary needs positive and negative cases:

- canonical production origin
- development fallback only outside production
- `/account`, `/admin?view=users`, protected content destinations
- `https://attacker.example`, `//attacker.example`, malformed input
- provider messages/codes that must not appear in returned copy

### Server page tests

`login-page.test.tsx` uses `renderToStaticMarkup` with module mocks. Keep this for server framing and exact copy. Do not attempt client interaction here.

### Browser tests

Use Playwright for:

- mode switching
- Enter-to-submit
- pending/confirmation geometry through controlled local mocks where available
- 375×812 and desktop screenshots/overflow
- focus order and axe

Do not call Google or send email in deterministic Playwright.

### Database tests

The pgTAP suite already covers transactional profile/bootstrap/roles. Modify SQL tests only if schema behavior changes. A UI/doc-only Phase 1 implementation should run the suite but must not rewrite deployed migrations.

## Landmines

- `SectionShell` applies a large heading block; authentication changes must keep the primary task visible within the first desktop viewport.
- `/api/health/ready` is a release-wide gate and includes Stripe. Read individual Supabase checks for Phase 1 evidence.
- The configured production origin must win over the browser/proxy origin, including previews.
- `signUp` may return no session when confirmation is enabled; never call profile bootstrap or redirect in that branch.
- A new callback helper must not bypass the recovery-specific `flow=recovery` query.
- Do not alter the one-time Admin migration to reproduce UAT. Historical evidence and the current production row are the proof.
- The worktree contains broad user changes; every plan must list exact files and commit only its own paths.

## PATTERN MAPPING COMPLETE

The phase can extend current helpers, client state, server framing, tests, and documentation without introducing a second Auth or role-management architecture.
