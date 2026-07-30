---
quick_id: 260730-jwd
title: Device-local guide reading progress
status: complete
completed: 2026-07-30
implementation_commit: 0a619a2
---

# Quick Task Summary

## Outcome

Every guide with a visible reading body now has a determinate reading-progress
surface. The compact percentage stays in the reading header, while a restrained
four-pixel bar appears below the sticky site navigation only during active
reading.

Meaningful progress is stored on the current device as a bounded list containing
only the guide slug, percentage, body-relative offset, and update time. Returning
to an incomplete guide shows an explicit **Resume at …%** action. Direct visits
remain at the top; Soji scrolls to the saved position only after the reader
activates Resume.

The interaction:

- uses a named native `progress` element,
- supports keyboard activation and a 44px mobile touch target,
- honors reduced-motion preference,
- reports when browser storage cannot save progress,
- avoids mounting progress when no guide body is visible, and
- requires no account, provider login, server history, or cross-device sync.

## Verification

- Web unit suite: 97 files and 695 tests passed.
- TypeScript typecheck passed.
- ESLint passed.
- Reading, responsive, and WCAG browser matrix: 44 passed and 2 intentional
  project-specific skips.
- Final focused reading-progress matrix: 3 passed and 1 intentional
  desktop-project mobile-contract skip.
- Browser visual review confirmed the zero-progress header, active fixed bar,
  Resume action, successful return to the stored position, and no console
  warnings or errors.
- The 320px boundary has no horizontal overflow and Resume remains at least
  44px in both dimensions.
- Production build passed with all 37 routes generated.
- The temporary long-reading visual fixture was fully reverted before commit.

## Files

- `apps/web/src/lib/reading-progress.ts`
- `apps/web/src/components/guide-reading-progress.tsx`
- `apps/web/src/app/library/[slug]/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tests/reading-progress.test.tsx`
- `apps/web/tests/content-detail-experience.test.tsx`
- `apps/web/e2e/reading-progress.spec.ts`

## Reference Decisions

- Apple Books' Continue pattern informed the explicit return-to-place action.
- Medium's reading history confirmed that continuity is a useful publication
  experience, while Soji deliberately keeps this first version device-local.
- W3C and MDN guidance informed the named native `progress` element rather than
  a visually styled but semantically empty bar.
