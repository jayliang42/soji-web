---
phase: 01
slug: production-identity-and-admin
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-26
---

# Phase 01 — UI Design Contract

> Visual and interaction contract for the Phase 1 authentication and Admin-access surfaces. Generated inline by Codex under `gsd-ui-phase --auto` and verified against `01-CONTEXT.md` and `01-RESEARCH.md`.

---

## Design Intent

The identity experience should feel like entering a trusted premium publication: calm, deliberate, editorial, and explicit about what happens next. It must not resemble a dense enterprise identity portal or a growth modal layered over content.

Reference hierarchy:

1. [Every sign-in](https://every.to/login) — focused page, negative space, single task.
2. [Substack sign-in](https://substack.com/sign-in) — low cognitive load and explicit account switching.
3. [MasterClass login](https://www.masterclass.com/auth/login) — social provider prominence, but not its crowded modal/provider stack.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing Tailwind CSS configuration; no new generator |
| Preset | Not applicable |
| Component library | Existing Soji React components; no third-party component registry |
| Icon library | No dependency required; use an inline accessible Google mark only if it has `aria-hidden="true"` and the button retains a text name |
| Display font | Georgia, Times New Roman, serif |
| Body font | Inter, Helvetica Neue, sans-serif |
| Radius | 4px controls, 6px fields, 8px panels; no oversized “AI SaaS” rounding |
| Elevation | Border-led surfaces; at most one subtle shadow on the primary auth card |

No shadcn, Radix, Base UI, or remote registry block should be introduced for this phase.

---

## Layout Contract

### Page shell

- Keep `/login` and `/reset-password` as dedicated routes rendered inside the public layout.
- Page content uses `max-w-6xl`, `px-6`, and `py-16 md:py-20`.
- Heading block uses a maximum readable width of `48rem`.
- The authentication task starts within the first desktop viewport at 1280×800 and remains reachable without horizontal scrolling at 375×812.

### Desktop authentication composition (`lg` and above)

- Use a two-column grid: primary task `minmax(0, 1.1fr)`, supporting context `minmax(18rem, 0.9fr)`.
- Grid gap: 32px.
- Primary card maximum width: 640px.
- Supporting context may contain only destination-aware guidance, account security reassurance, or an environment/setup state. It must not contain marketing carousels, app promotions, or duplicate CTAs.

### Mobile/tablet composition (below `lg`)

- Collapse to one column with the primary task first.
- Card padding: 24px; page horizontal padding: 24px.
- Supporting context follows the task and may be omitted when it does not help the current state.
- No fixed-height panels, off-screen modal, or horizontal control group.

### Reset-password composition

- Use one primary card with a maximum width of 640px.
- Keep invalid-link guidance and the valid reset form in the same visual position to avoid layout jumps between states.

---

## Spacing Scale

All declared values are multiples of 4 and align with existing Tailwind utilities.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label and compact status gaps |
| sm | 8px | Label-to-field, inline action spacing |
| md | 12px | Related controls and helper text |
| base | 16px | Default field group spacing |
| lg | 20px | Message-panel padding |
| xl | 24px | Mobile card padding and control sections |
| 2xl | 32px | Desktop grid and card section breaks |
| 3xl | 48px | Heading-to-task separation |
| 4xl | 64px | Mobile page-level vertical spacing |
| 5xl | 80px | Desktop page-level vertical spacing |

**Exceptions:** none.

Minimum interactive target height is 44px. Text fields and primary actions use 48px or more.

---

## Typography

| Role | Size | Weight | Line Height | Font |
|------|------|--------|-------------|------|
| Body | 16px | 400 | 1.6 | Inter |
| Supporting body | 14px | 400 | 1.55 | Inter |
| Label | 14px | 600 | 1.4 | Inter |
| Eyebrow | 12px | 700 uppercase | 1.3 | Inter |
| Card heading | 30px mobile / 36px desktop | 700 | 1.08 | Georgia |
| Page heading | 36px mobile / 48px desktop | 700 | 1.02 | Georgia |

- Do not use all-uppercase for button labels or form labels.
- Avoid body copy wider than 68 characters per line.
- Error and helper text remain at least 14px.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f4f5f2` | Page background |
| Primary surface | `#ffffff` | Auth card and reset panel |
| Secondary (30%) | `#eef0ec` | Supporting context and neutral status surfaces |
| Foreground | `#201f1c` | Headings, labels, primary controls |
| Muted text | `#655f58` | Descriptions and helper text |
| Border | `#c8ccc5` | Fields, cards, dividers |
| Accent (10%) | `#9b432b` | Active mode, recovery link, destination emphasis, primary email action |
| Accent muted | `#f4e6df` | Non-destructive error/recovery background |
| Success | `#2f6f3d` | Confirmed password/account state |
| Success muted | `#eef8ed` | Success panel background |
| Destructive/error | `#b42318` | Error icon/text/border only |

Accent is reserved for the active auth mode, email submit action, recovery link, and inline destination emphasis. It must not color all links or every interactive element.

Google remains a high-contrast `#201f1c` full-width action placed before email fields; do not reproduce Google blue as Soji's page accent.

All text/background and control combinations must meet WCAG 2.2 AA contrast.

---

## Authentication Control Hierarchy

Order inside the primary card:

1. Card heading and destination-aware explanation.
2. Full-width `Continue with Google` button.
3. Divider labeled `or continue with email`.
4. Explicit `Sign in` / `Create account` segmented mode control.
5. Email and password fields.
6. Full-width mode-specific email action.
7. Recovery action in sign-in mode.
8. One status/error region.

Rules:

- The mode control remains a real two-button group with `aria-pressed`.
- Changing modes preserves the email, clears any provider error, changes password autocomplete, and updates the action copy.
- Google and email actions must be disabled while an Auth request is pending.
- Pending labels name the operation: `Signing in…`, `Creating account…`, `Opening Google…`, or `Sending reset link…`; do not use the generic `Working...`.
- The password field may include an accessible show/hide control only if the button has the exact accessible names `Show password` and `Hide password` and does not change field value.
- Do not auto-submit when users switch modes.

---

## State Contract

### Default sign-in

- Heading uses destination-aware copy from `getLoginPageCopy`.
- Google appears first.
- Email and password are empty.
- Recovery action is visible below email sign-in.

### Create-account mode

- Password helper says `Use at least 8 characters.`
- Primary email action says `Create account`.
- Recovery action is hidden.

### Pending

- Disable all competing auth controls.
- Keep form geometry stable.
- Set `aria-busy="true"` on the form.

### Email confirmation required

- Replace provider buttons, mode control, and credential fields with:
  - Heading: `Check your inbox`
  - Body: `We sent a confirmation link to {email}. Open it to finish creating your Soji account.`
  - Guidance: `If it does not arrive, check spam or use a different email.`
  - Secondary action: `Use a different email`
  - Tertiary action: `Return to sign in`
- Do not claim that the user is signed in.
- The entered email is user-owned display data; do not persist it outside component state or analytics.

### Invalid credentials

- Error: `We couldn't sign you in with those details. Check your email and password and try again.`
- Do not reveal which credential failed.

### Signup/provider unavailable

- Error: `Account creation is temporarily unavailable. Try again shortly.`
- For Google: `Google sign-in is temporarily unavailable. Try again or continue with email.`
- Do not display raw Supabase/Google messages.

### Recovery request

- Missing email: `Enter your email first, then request a reset link.`
- Success: `If an account matches that email, a password reset link is on its way.`
- Failure: `The reset email could not be sent. Try again shortly.`

### Invalid/expired recovery callback

- Heading: `This reset link is no longer valid.`
- Body: `Request a new password reset email and open the newest link.`
- Action: `Request another link`

### Password updated

- Heading: `Password updated`
- Body: `Your new password is ready to use.`
- Primary action: `Continue to your account`

### Auth/session outage

- Keep protected actions unavailable.
- Explain that account status could not be checked; do not tell the user to upgrade or imply their role was removed.

---

## Copywriting Contract

| Element | Required Copy |
|---------|---------------|
| Google CTA | `Continue with Google` |
| Sign-in CTA | `Sign in with email` |
| Signup CTA | `Create account` |
| Email divider | `or continue with email` |
| Confirmation heading | `Check your inbox` |
| Recovery success | `If an account matches that email, a password reset link is on its way.` |
| Invalid credentials | `We couldn't sign you in with those details. Check your email and password and try again.` |
| Temporary Google failure | `Google sign-in is temporarily unavailable. Try again or continue with email.` |
| Password completion | `Continue to your account` |

No destructive confirmation exists in this Phase 1 auth UI. Admin role changes retain their existing explicit role labels and final-Admin error: `Keep at least one admin account before changing this role.`

---

## Accessibility and Interaction Contract

- Every field has a persistent visible label; placeholders are examples, never labels.
- The first page heading is the only `h1`; card/state headings are `h2`.
- Status-only messages use `role="status"`; failures that require correction use `role="alert"`.
- After an async failure, move focus to the alert only when it would otherwise be off-screen; do not steal focus for routine success.
- The confirmation-state heading receives programmatic focus after the form is replaced.
- Segmented-mode buttons, provider action, fields, recovery action, and submit are reachable in visual order.
- Pressing Enter in the password field submits the selected email mode.
- Focus outline remains the global 3px clay ring with a 3px offset.
- No state depends on color alone; pair color with text and border/icon treatment.
- Respect `prefers-reduced-motion`. Any opacity/background transition is at most 150ms and removed under reduced motion.
- At 200% zoom and 320 CSS px width, no horizontal overflow, clipped action label, or overlapping field control is allowed.

---

## Admin Surface Contract for Phase 1

Phase 1 does not redesign the Admin workspace. Any touched Admin identity/readiness UI must preserve:

- horizontal workspace navigation wrapping or scrolling without clipping at mobile widths
- source badges that distinguish demo, live Supabase, and unavailable data
- role language: `Member`, `Editor`, `Admin`
- first-Admin/bootstrap instructions shown only when relevant
- billing/user-role controls hidden from editors
- the final-Admin error adjacent to the attempted role change
- no raw database or provider identifiers in customer-facing errors

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None | Not required |
| Third-party registries | None | No registry code allowed in this phase |

---

## Visual Verification Matrix

| Route/state | Desktop | Mobile | Keyboard | Axe |
|-------------|---------|--------|----------|-----|
| `/login` default sign-in | Required | Required | Required | Required |
| `/login?next=/admin` | Required | Required | Required | Required |
| Create-account mode | Required | Required | Required | Required |
| Email-confirmation state | Required | Required | Required | Required |
| OAuth callback error | Required | Required | Required | Required |
| Recovery-request success/failure | Required | Required | Required | Required |
| `/reset-password` valid | Required | Required | Required | Required |
| `/reset-password` invalid | Required | Required | Required | Required |
| `/admin` live Admin and member-denied states | Required | Required | Required | Required |

Capture screenshots only from local/demo or redacted UAT accounts. Production evidence must never include visible email addresses, tokens, cookies, or secrets.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — every critical state has exact problem/next-step copy.
- [x] Dimension 2 Visuals: PASS — dedicated responsive layout, hierarchy, control order, and state replacements are defined.
- [x] Dimension 3 Color: PASS — semantic palette and restricted accent usage are explicit.
- [x] Dimension 4 Typography: PASS — sizes, weights, line heights, families, and casing rules are explicit.
- [x] Dimension 5 Spacing: PASS — 4px-based scale, panel geometry, touch targets, and responsive behavior are explicit.
- [x] Dimension 6 Registry Safety: PASS — no remote registry or new component library is permitted.

**Approval:** approved 2026-07-26

## UI-SPEC VERIFIED

All six dimensions pass and the contract preserves the authentication, redirect, privacy, and Admin decisions in `01-CONTEXT.md`.
