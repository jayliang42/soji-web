---
quick_id: 260730-iyl
title: Accessible detail-page sharing
status: complete
completed: 2026-07-30
implementation_commit: 61c4cff
---

# Quick Task Summary

## Outcome

Article and product detail pages now expose the same 44px accessible share
action in their supporting sidebars. The control:

- opens the platform share sheet when `navigator.share` is available;
- copies the exact current browser URL when native sharing is unavailable or
  fails;
- treats reader cancellation as a neutral outcome; and
- reveals, focuses, and selects a read-only URL field when both automatic
  paths are blocked.

Only the public page title and current URL enter the native share payload.
Success and progress labels are announced through a polite live region.

## Verification

- Web unit and server-rendering suite: 94 files, 679 tests passed.
- TypeScript route generation and typecheck: passed.
- ESLint: passed.
- Focused Playwright share flows: 7 passed, 1 desktop-only mobile-contract
  skip.
- Desktop WCAG 2 A/AA and 2.1 A/AA audit: 19 passed, including both changed
  detail pages.
- Browser visual review: article sidebar and product purchase-card placements
  passed at desktop width; the 320px Playwright contract found no horizontal
  overflow.
- Production build: compiled and generated 37 static pages successfully.

## Files

- `apps/web/src/components/share-button.tsx`
- `apps/web/src/app/library/[slug]/page.tsx`
- `apps/web/src/app/products/[slug]/page.tsx`
- `apps/web/tests/share-button.test.tsx`
- `apps/web/tests/content-detail-experience.test.tsx`
- `apps/web/tests/product-detail-experience.test.tsx`
- `apps/web/e2e/share-experience.spec.ts`

## Reference Decisions

- Follow Ghost's placement guidance by keeping sharing in contextual
  detail-page sidebars rather than promoting it above the primary reading or
  purchase action.
- Follow the Web Share API user-activation model and distinguish a reader's
  `AbortError` cancellation from an actual browser capability failure.
