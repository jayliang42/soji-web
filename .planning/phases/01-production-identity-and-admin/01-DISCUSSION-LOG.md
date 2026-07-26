# Phase 1: Production Identity and Admin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 1-production-identity-and-admin
**Mode:** `--auto`, authorized by the user's instruction for Codex to continue autonomously
**Areas discussed:** Authentication entry and visual hierarchy, Signup confirmation and password recovery, Production identity acceptance evidence, First Admin and operational handoff

---

## Authentication Entry and Visual Hierarchy

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| Authentication surface | Dedicated editorial page; modal over public site; bare utility form | Dedicated editorial page ✓ |
| Sign-in priority | Google shortcut plus email/password; email/password first; Google only | Google shortcut plus email/password ✓ |
| Sign-in versus signup | One component with explicit modes; separate routes; infer mode after email | One component with explicit modes ✓ |
| Successful destination | Validated destination with `/account` fallback; always `/account`; always homepage | Validated destination with `/account` fallback ✓ |

**Codex's choice:** Preserve the dedicated route and existing safe-return architecture, while refining the form into a calmer Google-prominent editorial experience.

**Notes:** Every provided the clearest focused-page reference. MasterClass demonstrated provider prominence but its modal and provider count are unnecessarily dense for Soji.

---

## Signup Confirmation and Password Recovery

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| Signup acknowledgement | In-page confirmation state; generic toast; immediate redirect | In-page confirmation state ✓ |
| Account enumeration | Uniform privacy-safe message; reveal account existence; no acknowledgement | Uniform privacy-safe message ✓ |
| Recovery link outcomes | Dedicated reset and recoverable failures; return all links to login; inline reset | Dedicated reset and recoverable failures ✓ |
| One-time email links | Supabase confirmation URL with tracking disabled; hand-built URL; unchecked defaults | Supabase confirmation URL with tracking disabled ✓ |

**Codex's choice:** Treat signup, recovery request, valid reset, invalid reset, and successful update as explicit states with safe copy and a clear next action.

**Notes:** Supabase documentation warns that email tracking and security prefetching can break one-time links. Phase 1 keeps the supported confirmation flow and verifies production email behavior rather than inventing a token protocol.

---

## Production Identity Acceptance Evidence

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| Authoritative environment | Canonical HTTPS production domain; preview deployment; localhost | Canonical HTTPS production domain ✓ |
| SMTP coverage | Two mailbox providers; one provider; dashboard-only evidence | Two mailbox providers ✓ |
| Evidence format | Dated secret-free UAT record; sensitive screenshots; no durable record | Dated secret-free UAT record ✓ |
| Application signals | Supabase source plus all readiness signals; successful redirect only; dashboard configuration only | Supabase source plus all readiness signals ✓ |

**Codex's choice:** Require provider-backed browser journeys and server-side readiness evidence together. Neither configuration screenshots nor local success prove production.

**Notes:** Existing launch documentation reports completed production Supabase and first-Admin work but leaves the canonical-domain callback, custom SMTP, and full email/recovery journeys open.

---

## First Admin and Operational Handoff

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| Existing bootstrap | Reuse evidence and do not rerun; rerun per deployment; replace with direct writes | Reuse evidence and do not rerun ✓ |
| Bootstrap proof | Role and audit invariants; Admin page access only; Auth metadata only | Role and audit invariants ✓ |
| Later role changes | Audited Users workspace; SQL Editor; provider metadata | Audited Users workspace ✓ |
| Continuity test | Temporary second-Admin UAT; no later-change test; two permanent Admins | Temporary second-Admin UAT ✓ |

**Codex's choice:** Preserve the one-time bootstrap boundary and exercise the supported Admin Users workflow for all later changes, including final-Admin protection.

**Notes:** The first bootstrap has already been completed according to the current launch checklist. Repeating it is not a valid verification method and should fail once an Admin exists.

---

## Codex's Discretion

- Exact responsive layout, spacing, typography, field ordering, and microcopy within the locked interaction decisions.
- Whether secret-free UAT evidence lives inline in the launch checklist or in a linked Phase 1 document.
- Test organization and component boundaries used to preserve current security and redirect contracts.

## Deferred Ideas

None.
