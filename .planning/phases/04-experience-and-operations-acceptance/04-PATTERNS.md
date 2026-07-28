---
phase: 04
slug: experience-and-operations-acceptance
status: complete
created: 2026-07-28
---

# Phase 4 — Existing Pattern Map

## Experience Acceptance

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Workflow/state browser matrix | `apps/web/e2e/public-pages.spec.ts` | Deterministic demo/server state, role/name assertions, forbidden-action checks |
| Accessibility/overflow matrix | `apps/web/e2e/accessibility.spec.ts` | Shared route tables, axe severity gate, keyboard, zoom, reduced motion |
| Customer unavailable states | `apps/web/tests/session-failure-pages.test.tsx` | Fail closed, state that access did not change, no upgrade/private sentinel |
| Admin narrow-screen billing | `AdminBillingEvents` | Receipt and processing projections, independent pending sets, result focus target |
| Admin cleanup action | `AdminProductAssetCleanup` | One role-gated action, exact aggregate announcement, durable rows |

## Operations Alerts

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Local operational record | `createOperationalLog` | Stable event code, UTC timestamp, bounded scalar context |
| External payload builder | Billing presentation helpers | Pure allowlist projection with explicit union values |
| Secondary delivery | `reportOperationalError` | Local log first, bounded fetch, delivery failure never changes original result |
| Receiver readiness | `env.ts` + `admin-launch-checklist.ts` | One validator drives runtime and operator state |
| Contract tests | `apps/web/tests/observability.test.ts` | Injected fetch/console, exact body/options, failure isolation |

## Scheduled Cleanup

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Authorization | `cron-auth.ts` | Config gate plus timing-safe exact Bearer comparison |
| Shared executor | `processDueProductAssetCleanupJobs` | RPC claim, lease recovery, fixed actor/limit, durable attempt result |
| Scheduler route | cron cleanup route | Thin auth/service/executor/result adapter |
| Admin route | Admin cleanup route | Same executor behind role check |
| Route regression | `product-asset-cleanup-cron-route.test.ts` | Stable status/body, mocked service boundary, no raw error/path |

## Evidence and Release

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Fixed evidence validator | `scripts/check-phase3-uat-evidence.mjs` | Import-safe parser, fixed IDs, proof classes, structure and ready modes |
| Evidence tests | `scripts/check-phase3-uat-evidence.test.mjs` | Temp ledgers, duplicate/missing/privacy/config-promotion rejection |
| Operator runbook | `docs/phase-3-launch-content-and-policy.md` | Automated commands plus one consolidated owner checkpoint |
| Package scripts | Root `package.json` Phase 3 commands | `phase4:uat:check` and `phase4:uat:ready` |

## Hotspots

- `observability.ts` is called across auth, billing, checkout, Admin, and cleanup;
  retain its public entry point while narrowing only the secondary webhook body.
- `AdminBillingEvents` is already large. Extract pure presentation/operation helpers
  only when that makes exact unit assertions possible; do not fork a mobile component.
- Browser acceptance should extend the existing Playwright fixtures and server, not add
  another environment.
- Cleanup paths and provider error text must be stripped at the route/evidence boundary
  even though Admin may display a safe filename in its authenticated workspace.
- Existing untracked or modified files outside the explicit plan lists belong to the
  user and must not be staged.

## Data Flow

```text
authoritative server snapshot
  → bounded presentation model
  → semantic customer/Admin state
  → keyboard/focus/overflow/axe acceptance

business failure
  → durable local operational log
  → allowlisted v1 alert envelope
  → bounded HTTPS delivery
  → local-only secondary delivery failure

scheduler request
  → exact Bearer auth
  → shared lease cleanup executor
  → durable attempt state
  → aggregate response only
```

## PATTERN MAPPING COMPLETE

