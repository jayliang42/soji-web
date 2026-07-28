---
phase: 03-launch-content-and-customer-policy
plan: "01"
subsystem: content
tags: [supabase, postgres, pgtap, nextjs, zod, access-control]

requires:
  - phase: 01-production-identity-and-admin
    provides: Role-checked publisher context and server-only Supabase boundaries
  - phase: 02-billing-and-fulfillment-uat
    provides: Authoritative entitlement and fail-closed readiness patterns
provides:
  - Explicit preview, cover-alt, and tag storage for published content
  - Revision-safe publisher RPC with atomic access-rule updates
  - Server-selected full, preview, locked, and unavailable body projection
  - Strict Admin publication validation with draft preservation
affects:
  - 03-02 flagship content and reader UI
  - 03-05 launch readiness and evidence
  - CONT-01

tech-stack:
  added: []
  patterns:
    - Restricted body selection occurs on the server before Markdown rendering
    - Forward migration and declarative schema mirror share one RPC signature
    - Published launch metadata is strict while unpublished drafts may remain incomplete

key-files:
  created:
    - supabase/migrations/20260726120000_launch_content_contract.sql
  modified:
    - supabase/schema.sql
    - supabase/tests/database_access.sql
    - apps/web/src/lib/content.ts
    - apps/web/src/lib/content-access.ts
    - apps/web/src/app/api/admin/content/route.ts
    - apps/web/src/lib/supabase/database.types.ts

key-decisions:
  - "Preview copy is a first-class field selected on the server; summary fallback and CSS hiding are not access boundaries."
  - "Published content requires a cover, useful alternative text, and tags, while unpublished drafts remain editable before launch metadata is complete."
  - "Owned root-relative /covers/ assets are accepted alongside draft-compatible absolute URLs; final launch readiness owns the stricter first-party asset gate."

patterns-established:
  - "Content projection: full returns body, preview and unavailable return preview, and locked returns null."
  - "Database change: immutable migration, idempotent schema mirror, pgTAP privilege/rollback checks, then generated type parity."

requirements-completed: [CONT-01]

duration: 7min
completed: 2026-07-28
---

# Phase 3 Plan 1: Launch Content Contract Summary

**Explicit preview, owned-cover metadata, live tags, and revision-safe publication now share one tested database, Admin, and server-projection contract**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-28T02:36:00Z
- **Completed:** 2026-07-28T02:43:23Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Added first-class `preview_markdown`, `cover_image_alt`, and `tags` columns with a forward migration, idempotent schema mirror, role-limited RPC, and exact generated TypeScript types.
- Changed restricted-content projection so preview and unavailable states receive only explicit public preview copy, locked receives no body, and full access alone receives the complete body.
- Added strict publication validation and Admin authoring controls for preview, cover description, tags, owned root-relative covers, and normalized payloads while preserving revision conflicts and incomplete drafts.
- Expanded pgTAP coverage to 277 passing checks, including the new signature, role grants, metadata persistence, publication timestamp preservation, rollback, and stale-write behavior.

## Task Commits

1. **Task 1 RED: Write database and projection contracts** - `b0927c2` (test)
2. **Task 2 GREEN: Implement the forward content contract and strict Admin write** - `e4b5eea` (feat)
3. **Task 3: Apply local schema and generate exact database types** - `41e6565` (chore)

## Files Created/Modified

- `supabase/migrations/20260726120000_launch_content_contract.sql` - Forward columns and expanded publisher RPC.
- `supabase/schema.sql` - Idempotent declarative mirror for the content contract.
- `supabase/tests/database_access.sql` - Column, signature, privilege, persistence, revision, and rollback proof.
- `packages/types/src/index.ts` - Shared preview and cover-alt content fields.
- `packages/domain/src/plans.ts` - Explicit preview metadata for existing demo fixtures.
- `apps/web/src/lib/content.ts` - Live metadata selection and snake_case mapping.
- `apps/web/src/lib/content-access.ts` - Fail-closed visible-body projection.
- `apps/web/src/app/api/admin/content/route.ts` - Strict launch publication validation and RPC mapping.
- `apps/web/src/components/admin-content-form.tsx` - Preview, cover description, and tag authoring.
- `apps/web/src/components/admin-content-editor.tsx` - Revision-safe editing for the new metadata.
- `apps/web/src/lib/supabase/database.types.ts` - Generated local-schema types.
- `apps/web/tests/content-access.test.ts` - Private-body sentinel and explicit-preview behavior.
- `apps/web/tests/admin-content-route.test.ts` - Strict launch payload and stable route behavior.
- `apps/web/tests/content-card.test.tsx` - Updated shared content fixture contract.

## Decisions Made

- The summary remains short card metadata; `preview` is the only restricted opening eligible for reader rendering.
- Root-relative `/covers/...` paths are valid Admin inputs so repository-owned launch art does not require a remote URL.
- Publication validation is conditional: published rows fail closed on missing launch metadata, while unpublished updates preserve editorial drafts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added idempotent ALTER statements for existing databases**

- **Found during:** Task 2 database acceptance
- **Issue:** Adding columns only inside `create table if not exists` left an already-created local table without the new fields when `schema.sql` was reapplied.
- **Fix:** Added explicit `alter table ... add column if not exists` statements to the declarative schema mirror.
- **Files modified:** `supabase/schema.sql`
- **Verification:** Schema reapply passed; the complete 277-test pgTAP file then passed.
- **Committed in:** `e4b5eea`

**2. [Rule 3 - Blocking] Updated shared demo and card fixtures for the required content contract**

- **Found during:** Task 2 type integration
- **Issue:** Making preview and cover alt required exposed existing typed fixtures that lacked the new first-class fields.
- **Fix:** Added explicit safe previews and empty cover descriptions to supporting demo fixtures and the content-card test.
- **Files modified:** `packages/domain/src/plans.ts`, `apps/web/tests/content-card.test.tsx`
- **Verification:** Web typecheck and the full Vitest run completed successfully.
- **Committed in:** `e4b5eea`

---

**Total deviations:** 2 auto-fixed (1 schema idempotence bug, 1 blocking type-contract ripple)
**Impact on plan:** Both fixes were required to keep existing installations and typed demo paths compatible; no architecture or external production state changed.

## Issues Encountered

- Sandboxed Docker access initially returned a permission error. The local daemon was available once the bounded Docker/Supabase commands were authorized; no provider login or production credential was required.

## Verification

- RED observation: 4 focused failures named missing preview and publication metadata behavior.
- Web suite after GREEN: 76 test files and 548 tests passed.
- Full database access contract: 277/277 pgTAP tests passed.
- Schema idempotence and billing-adjustment regression: 97/97 pgTAP tests passed.
- Local migration history ends at `20260726120000`.
- Generated database-type parity and Web typecheck passed.
- No migration or schema change was pushed to production.

## User Setup Required

None for this plan.

## Next Phase Readiness

- Plan 03-02 can publish the flagship guide against explicit preview/cover/tag fields and render each reader state without body leakage.
- Plan 03-05 can evaluate live launch content without treating demo rows or external hotlinks as production-ready.

## Self-Check: PASSED

- The migration, schema mirror, pgTAP contract, generated types, route, Admin forms, loader, and access projection exist.
- Commits `b0927c2`, `e4b5eea`, and `41e6565` exist in order.
- Targeted Web, full database access, schema parity, generated-type parity, and Web typecheck gates pass.
- `PRIVATE BODY` remains absent from preview, locked, and unavailable results.

---
*Phase: 03-launch-content-and-customer-policy*
*Completed: 2026-07-28*
