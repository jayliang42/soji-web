---
phase: 03-launch-content-and-customer-policy
plan: "02"
subsystem: content-publication
tags: [nextjs, supabase, editorial, membership, accessibility, content-security]

requires:
  - phase: 03-launch-content-and-customer-policy
    provides: Server-authoritative content access projection from Plan 03-01
provides:
  - Original flagship member guide with an owned first-party editorial cover
  - Idempotent Supabase launch migration and aligned local seed
  - Premium responsive Library cards and editorial reader states
  - Human access labels and destination-aware conversion actions
  - Static-render and browser coverage proving restricted-body non-disclosure
affects:
  - 03-05 launch readiness and evidence
  - CONT-01
  - Phase 4 public launch surfaces

tech-stack:
  added: []
  patterns:
    - Server-selected content projections are the only bodies passed to the Markdown renderer
    - Customer access states use human labels and exact next actions instead of entitlement keys
    - First-party covers use explicit intrinsic dimensions, semantic alt text, and safe placeholders

key-files:
  created:
    - apps/web/public/covers/wealth-without-drift.webp
    - supabase/migrations/20260726121000_publish_flagship_guide.sql
    - apps/web/src/components/content-cover.tsx
    - apps/web/src/lib/content-access-presentation.ts
    - apps/web/tests/library-pages.test.tsx
  modified:
    - packages/domain/src/plans.ts
    - supabase/seed.sql
    - apps/web/src/app/library/page.tsx
    - apps/web/src/app/library/[slug]/page.tsx
    - apps/web/src/components/content-card.tsx
    - apps/web/src/components/content-preview-cta.tsx
    - apps/web/src/components/markdown-content.tsx
    - apps/web/tests/content-card.test.tsx
    - apps/web/tests/discovery-metadata.test.ts

key-decisions:
  - "The launch flagship is Wealth Without Drift: A 90-Minute Decision Reset, published as members-only content requiring content.basic."
  - "The flagship cover is an original repository-owned 4:3 still life with no people, logos, currency, or performance claims."
  - "Library and detail actions are state-specific: Read article, Read preview, or View access."
  - "Unauthorized markup receives only the server-authorized preview or lock projection; restricted body text is never rendered and hidden with CSS."

patterns-established:
  - "Editorial card order: cover -> type/date -> title -> summary -> tags -> access/action."
  - "Reader state matrix: public/full, preview, locked, and unavailable each have truthful copy and one exact recovery path."

requirements-completed: [CONT-01]

duration: 24min
completed: 2026-07-28
---

# Phase 3 Plan 2: Flagship Content and Premium Reader Summary

**Soji now launches with a substantive original guide, owned visual identity, and a responsive premium-editorial Library that preserves server-authoritative membership access**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-28T03:49:00Z
- **Completed:** 2026-07-28T04:13:47Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Published the 1,729-word `Wealth Without Drift` flagship guide with a useful 198-word preview, stable metadata, four practical tags, an explicit non-advice boundary, and an original 4:3 WebP cover.
- Added an idempotent Supabase migration and aligned seed row with the same slug, title, preview intent, cover metadata, publication time, visibility, and `content.basic` rule.
- Rebuilt Library cards and the article reader around an editorial hierarchy with responsive layouts at 320, 375, and 1440 pixels.
- Replaced raw access mechanics with human labels and exact guest/member actions while preserving destination-aware sign-in.
- Added static-render, metadata, accessibility, and end-to-end coverage for public, preview, locked, full, unavailable, and session-failure states.

## Task Commits

1. **Task 1: Publish the original flagship guide and cover** - `de23133` (feat)
2. **Task 1: Align the idempotent local seed** - `e95fdd0` (chore)
3. **Task 2: Deliver premium Library and reader states** - `124c8ab` (feat)

## Files Created/Modified

- `apps/web/public/covers/wealth-without-drift.webp` - Original 1448×1086 first-party editorial cover.
- `supabase/migrations/20260726121000_publish_flagship_guide.sql` - Idempotent flagship publication and entitlement rule.
- `supabase/seed.sql` and `packages/domain/src/plans.ts` - Aligned local/demo projections and supporting-fixture labels.
- `apps/web/src/components/content-cover.tsx` - Semantic 4:3 cover with intrinsic dimensions and safe fallback.
- `apps/web/src/lib/content-access-presentation.ts` - Human access labels, membership names, and exact actions.
- `apps/web/src/components/content-card.tsx` - Responsive featured and supporting editorial cards.
- `apps/web/src/app/library/page.tsx` - Premium Library introduction, semantic collection, and truthful empty state.
- `apps/web/src/app/library/[slug]/page.tsx` - Editorial header and server-selected reader state matrix.
- `apps/web/src/components/content-preview-cta.tsx` - Destination-aware guest and member conversion paths.
- `apps/web/tests/library-pages.test.tsx` and related suites - Rendering, metadata, recovery, and restricted-body assertions.

## Decisions Made

- The flagship uses a stable launch timestamp and one canonical slug across migration, seed, and domain fixtures.
- Demo/supporting fixtures remain available for representative states but are explicitly tagged so they cannot be mistaken for launch content.
- The card grid gives the flagship extra desktop emphasis without introducing fixed widths or mobile overflow.
- Full member views contain no preview conversion block; unavailable states never imply that upgrading will repair missing content.
- Metadata is built only from title, summary, and cover fields and never from restricted article body text.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added shared access-presentation mapping**

- **Found during:** Task 2 implementation
- **Issue:** Card and detail surfaces needed the same human membership labels and exact actions without exposing entitlement identifiers.
- **Fix:** Added one pure presentation module consumed by both surfaces.
- **Files modified:** `apps/web/src/lib/content-access-presentation.ts`
- **Verification:** Static-render tests cover guest, signed-in lock, full, and unavailable variants.
- **Committed in:** `124c8ab`

**2. [Rule 1 - Bug] Updated complete browser fixtures after the flagship became first**

- **Found during:** Full end-to-end regression
- **Issue:** Existing scenarios assumed the former demo article was the first Library/Admin result and used older navigation labels.
- **Fix:** Targeted deterministic article slugs, scoped repeated landmarks, and aligned assertions with the current customer copy.
- **Files modified:** `apps/web/e2e/public-pages.spec.ts`, `apps/web/e2e/accessibility.spec.ts`
- **Verification:** All 82 desktop, mobile, and accessibility Playwright scenarios pass.
- **Committed in:** `124c8ab`

---

**Total deviations:** 2 auto-fixed (1 shared presentation boundary, 1 deterministic browser-fixture update)
**Impact on plan:** Both changes preserve the intended access matrix and make full regression coverage deterministic; no product scope changed.

## Issues Encountered

- The repository contained unrelated pre-existing edits. Every commit used explicit path-scoped staging; those changes remain untouched.
- The seed file already contained a separate unstaged customer-support edit. Only the exact flagship seed hunk was committed.

## Verification

- Focused reader, access, metadata, and Markdown suites passed.
- Full Web regression passed: 81 files, 609 tests.
- Domain regression passed: 3 tests.
- Full Playwright regression passed: 82 desktop, mobile, and accessibility scenarios.
- Workspace lint and typecheck passed.
- Production Next.js build passed and generated all 37 routes.
- Supabase type generation, migrations through `20260726121000`, and database lint passed.
- Browser inspection at 320, 375, and 1440 pixels found no horizontal overflow or console errors.
- Unauthorized static markup contains no restricted-body sentinel.

## User Setup Required

None for this plan. Provider-backed login and policy-owner tasks remain grouped in the single consolidated external checkpoint.

## Next Phase Readiness

- Plan 03-05 can consume the canonical flagship slug, customer-facing access states, and completed browser evidence.
- Phase 3 now has one remaining plan: final Admin launch readiness and evidence.
- No provider login is required before local Plan 03-05 implementation begins.

## Self-Check: PASSED

- All planned flagship, migration, seed, Library, reader, and test artifacts exist.
- All three production commits exist and contain only Phase 03-02 paths.
- Full unit, end-to-end, lint, typecheck, build, browser, and database checks pass.
- Customer markup exposes neither entitlement keys nor restricted article body text.

---
*Phase: 03-launch-content-and-customer-policy*
*Completed: 2026-07-28*
