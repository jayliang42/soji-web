---
phase: 04
slug: experience-and-operations-acceptance
status: complete
researched: 2026-07-28
---

# Phase 04 — Experience and Operations Acceptance Research

## User Constraints

The locked decisions are D-01 through D-23 in `04-CONTEXT.md`. In particular:

- Acceptance is workflow-first and spans public, authentication, commerce, library,
  office-hours, account, and every Admin workspace at 320, 375, 768, 1024, and 1440px.
- Loading, empty, success, unavailable, and recoverable failure states must expose only
  truthful actions; degraded authority data must fail closed.
- Admin retains full narrow-screen capability and presents receipt state separately from
  processing outcome.
- Operations alerts are bounded, versioned, redacted secondary delivery after a durable
  local record.
- Scheduled and Admin cleanup share the lease-based executor, use exact Bearer
  authorization, and return aggregate results only.
- Automated evidence and real owner/provider observations remain separate. All external
  observations are deferred to one consolidated checkpoint.
- No new customer feature, analytics, search, notification product, or mobile purchase
  scope belongs in this phase.

Codex may refine responsive composition, status treatment, microcopy, focus behavior,
and the fixed evidence schema without weakening those constraints.

## Summary

Phase 4 should harden the existing modular monolith rather than introduce new libraries
or parallel services. The repository already has the correct primitives: Next.js Route
Handlers, Vitest unit/route tests, Playwright desktop/mobile browser tests, axe scans,
server-owned session and entitlement snapshots, a lease-based cleanup executor, and a
local-first operational logger. [VERIFIED: repository inspection]

The highest-value work is to tighten three contracts:

1. a reusable workflow/state browser matrix with exact semantic and focus assertions;
2. a deliberately small `v1` operations-alert envelope that cannot serialize arbitrary
   errors or context;
3. a scheduled-cleanup boundary whose authentication, aggregate output, lease failure,
   and retry behavior are directly tested.

## Standard Stack

| Concern | Standard | Evidence |
|---------|----------|----------|
| Server/UI | Existing Next.js 15 App Router and React 19 | [VERIFIED: `apps/web/package.json`] |
| Route boundaries | Existing App Router `route.ts` handlers using Web Request/Response APIs | [CITED: https://nextjs.org/docs/app/getting-started/route-handlers] |
| Unit and route tests | Existing Vitest 4 suite | [VERIFIED: `apps/web/package.json`] |
| Browser acceptance | Existing Playwright 1.61 desktop/mobile projects | [VERIFIED: `apps/web/playwright.config.ts`] |
| Automated accessibility | Existing `@axe-core/playwright`; serious/critical violations block | [CITED: https://playwright.dev/docs/accessibility-testing] |
| Semantic structure | Targeted role/name/focus assertions; small ARIA snapshots only where structure is stable | [CITED: https://playwright.dev/docs/aria-snapshots] |
| Styling | Existing Tailwind tokens and Soji editorial/Admin components | [VERIFIED: `docs/soji-ui-style-guide.md`] |
| Alert transport | Existing `fetch` with `AbortSignal.timeout`; add explicit redirect refusal | [CITED: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static] |
| Cleanup | Existing Supabase RPC lease executor and cron route | [VERIFIED: repository inspection] |

No package addition is required.

## Architecture Patterns

### Pattern 1 — State fixtures drive workflow assertions

Keep authority and business truth in server-owned snapshots. Browser fixtures may select
a deterministic state, but tests assert what the real page exposes: heading, state copy,
available action, forbidden action, focus target, live announcement, and overflow. This
avoids a screenshot-only matrix and follows Next.js guidance to use E2E testing for async
server components. [CITED: https://nextjs.org/docs/app/guides/testing]

### Pattern 2 — Operational log and alert envelope are separate types

`OperationalLog` may remain useful for local diagnosis, but the webhook body must be
constructed from an allowlist:

- `schemaVersion: 1`
- `eventCode`
- `severity`
- `subsystem`
- `occurredAt`
- `environment`
- `retryable`
- optional bounded `reference`

Do not forward `error`, arbitrary `context`, raw provider text, URLs, identities, headers,
or payloads. Delivery uses validated HTTPS, `redirect: "error"`, a 2-second timeout, and
one stable local secondary-delivery event. [VERIFIED: repository + D-11 through D-15]

### Pattern 3 — One cleanup executor, two authenticated boundaries

Both Admin and scheduler routes call `processDueProductAssetCleanupJobs`. The cron route
only authenticates, constructs the service client, selects the fixed actor/limit, and
maps the shared result to a stable aggregate response. Claim/attempt-record failures
return failure; per-object Storage failures remain durable and retryable. [VERIFIED:
`product-asset-cleanup.ts` and cron route]

### Pattern 4 — Fixed evidence IDs, proof-class enforcement

Generate a Phase 4 evidence ledger from a fixed validator. Automated rows require a
command and commit; live rows require a canonical UTC observation. Test fixtures can
never satisfy alert-receiver delivery, production scheduler invocation, or privileged
production Admin observation.

## Don't Hand-Roll

- Do not add a second browser runner, accessibility scanner, component library, webhook
  SDK, queue, scheduler, or cleanup implementation.
- Do not duplicate Admin mobile screens or hide actions by viewport.
- Do not serialize an arbitrary error/context object and then attempt denylist redaction.
  Build the external payload from an allowlist.
- Do not use screenshots as acceptance authority.
- Do not fake live evidence with configuration presence or local mock delivery.

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Axe passes while keyboard/focus behavior fails | Add explicit Tab/Enter/focus/live-region assertions; automated accessibility detects only part of the problem. [CITED: https://playwright.dev/docs/accessibility-testing] |
| Large ARIA snapshots become brittle | Use targeted assertions by default and small stable snapshots only for receipt/processing hierarchy. [CITED: https://playwright.dev/docs/aria-snapshots] |
| Alert redaction misses a new context field | External envelope is allowlisted and has no arbitrary error/context property. |
| Webhook follows a redirect to an unsafe destination | Set `redirect: "error"` and test redirect rejection. |
| Alert failure recursively alerts | Secondary failure calls local logging only with a stable code. |
| Cron route leaks cleanup paths/errors | Project only aggregate counts and stable reason/status at the route boundary. |
| A partial cleanup is reported as success | Assert `ok: false` for claim/attempt-record failure and retryable job state for Storage failure. |
| Responsive Admin tests only cover Overview | Enumerate every `view=` workspace at narrow and desktop widths. |
| Test fixture is promoted to production truth | Evidence validator enforces `automated` versus `owner_provider` proof classes. |

## Validation Architecture

Use four feedback layers:

1. **Task loop:** targeted Vitest file(s), under 15 seconds.
2. **Plan loop:** web unit/route tests plus focused Playwright spec, under 90 seconds.
3. **Phase loop:** lint, typecheck, build, full Vitest, full Playwright desktop/mobile,
   evidence validator, database tests and type parity.
4. **External checkpoint:** one final owner/provider checklist only; never blocks local
   implementation progress.

Browser acceptance must assert:

- 320/375/768/1024/1440 width without horizontal overflow;
- visible and reachable primary actions;
- serious/critical axe count zero;
- deterministic loading/empty/success/unavailable/failure states where applicable;
- no privileged action in degraded state;
- distinct Billing receipt and processing labels;
- independent pending state and retained focus for search/filter/pagination/Retry/reconcile;
- reduced motion and 200% text behavior.

## Recommended Plan Split

1. Customer and Admin semantic/responsive acceptance matrix.
2. Versioned redacted operations-alert contract and controlled receiver tests.
3. Scheduled cleanup authentication/result contract and failure/retry tests.
4. Fixed Phase 4 evidence ledger, full regression, and one consolidated external
   checkpoint.

## Sources

- https://playwright.dev/docs/accessibility-testing
- https://playwright.dev/docs/test-assertions
- https://playwright.dev/docs/aria-snapshots
- https://playwright.dev/docs/best-practices
- https://nextjs.org/docs/app/guides/testing
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static

