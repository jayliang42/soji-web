---
phase: 3
slug: launch-content-and-customer-policy
status: complete
created: 2026-07-26
---

# Phase 3 — Existing Pattern Map

## Purpose

Map each likely Phase 3 file to the closest proven Soji analog so execution
extends current boundaries instead of introducing parallel systems.

## Content Data and Publication

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| `packages/types/src/index.ts` content fields | Existing `ContentItem` | Shared camelCase domain contract; database mapping stays Web-only |
| New content migration + `supabase/schema.sql` | `20260714020000_content_optimistic_concurrency.sql` and `upsert_content_item` | Forward-only migration, revision-required update, stable conflict SQLSTATE |
| `apps/web/src/lib/content.ts` mapping | Existing `mapContentRow` | Explicit `Pick<Tables<...>>`, map snake_case once, live source authoritative |
| `apps/web/src/lib/content-access.ts` preview selection | Existing full/preview/locked/unavailable policy | Pure functions with injected session inputs; body selection before render |
| Admin content validation | `apps/web/src/app/api/admin/content/route.ts` | Strict zod boundary, stable reason, operational detail stays server-side |
| Owned cover asset | Existing `apps/web/public/well-endowed-hero.png` | First-party optimized static asset, meaningful alt, no remote runtime dependency |

## Reader UI

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Featured Library card | `ContentCard` + homepage editorial sections | Server-rendered semantic article, Georgia title, Inter copy, low-radius border |
| Article header/body | `SectionShell` + `MarkdownContent` | Sequential headings, safe Markdown, 6xl/72ch constraints |
| Preview transition | `ContentPreviewCta` | One boundary, destination-aware login, membership comparison |
| State errors | `DataUnavailable` / `DataEmpty` | Problem + safe truth + next step, never infer lost access |
| Access labels | Account billing presentation helpers | Derive a human label from authoritative state; no raw enum/key |

## Office Hours

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Launch URL validator | `product-asset-validation.ts` + `env.ts` validators | One pure validator reused by route/readiness/tests |
| Presentation projection | `account-subscriptions.ts` presentation builder | Convert operational state into bounded customer copy/actions |
| Admin route changes | `api/admin/office-hours/route.ts` | Role context first, strict payload, stable validation/conflict outcomes |
| Access failure rendering | `session-failure-pages.test.tsx` | Private sentinel target absent from HTML; no false upgrade prompt |

## Policy and Checkout

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| `PolicyLayout` | `SectionShell` and long-form `MarkdownContent` rhythm | Static server component, metadata per route, 65–72ch prose |
| Footer groups | `PublicNavigation` | Typed internal links, visible active/focus state, mobile wrap |
| Purchase disclosure | Pricing soft-entry block and Products trust row | Adjacent plain-language copy, text links, no modal/hidden fine print |
| Stripe Terms consent | Existing Checkout Session creation | Server-owned Session options; client identifies intent only |
| Public config gates | `env.ts`, `readiness.ts`, `admin-launch-checklist.ts` | Typed validation, named boolean, fail closed, no secret output |

## Evidence and Tests

| Planned role | Closest analog | Pattern to preserve |
|--------------|----------------|---------------------|
| Phase 3 evidence artifact | Phase 2 `02-EVIDENCE.md` + validator | Fixed scenarios, PENDING baseline, no fabricated provider PASS |
| Route tests | `admin-content-route.test.ts`, `admin-office-hours-route.test.ts` | Mock publisher/Supabase boundaries; exact stable response assertions |
| Markup leak tests | `session-failure-pages.test.tsx` | `renderToStaticMarkup`, positive state copy plus forbidden sentinel assertion |
| Browser acceptance | `e2e/public-pages.spec.ts`, `e2e/accessibility.spec.ts` | Fixed viewports, axe/overflow/keyboard assertions, deterministic demo data |
| Schema parity | `scripts/sync-supabase-types.mjs` and DB release checks | Local migrated database is source for generated type verification |

## Hotspots and Ownership

- `supabase/schema.sql`, content migration, generated database types, and RPC
  tests must be changed in one schema plan to avoid partial signatures.
- `apps/web/src/app/layout.tsx` is the only global footer owner during the policy
  plan.
- Both Checkout routes must share one Terms/config helper rather than drift.
- `apps/web/src/lib/readiness.ts` and `admin-launch-checklist.ts` should consume
  the same launch evaluation, not reimplement rules.
- Existing mobile and unrelated documentation changes are out of scope and must
  not be staged.

## Data Flow

```text
Admin input
  → strict shared launch validator
  → revision-safe RPC / Supabase row
  → server-only loader
  → access/lifecycle presentation projection
  → reader component receives only visible body/action

Static policy source + public owner flags
  → readiness / Checkout gate
  → adjacent disclosure
  → Stripe-hosted Terms acceptance
```

## PATTERN MAPPING COMPLETE
