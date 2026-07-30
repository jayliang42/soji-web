---
quick_id: 260730-jk6
title: Office Hours calendar download
status: complete
completed: 2026-07-30
implementation_commit: 9496d6a
---

# Quick Task Summary

## Outcome

Valid upcoming Office Hours now offer an accessible **Add to calendar** action
beside the existing copy fallback. The browser downloads a standards-based
`.ics` file with:

- the known start represented as UTC,
- a stable event identity and safe bounded filename,
- RFC 5545 text escaping and UTF-8 byte-aware line folding,
- public title, description, and online location only, and
- no invented end time or duration.

The download never includes protected signup or replay destinations. It
requires no Soji, Google, Apple, or calendar-provider login.

The control reports download success or failure in place through a polite live
region, preserves a 44px touch target, and leaves **Copy date and title**
available as the manual fallback.

## Verification

- Web unit tests: 96 files and 688 tests passed.
- TypeScript typecheck passed.
- ESLint passed.
- Focused Office Hours browser tests: 5 passed and 1 intentional
  desktop-project mobile-contract skip.
- Browser visual review confirmed the action hierarchy, in-place success
  feedback, responsive layout, and no console errors.
- Production build passed with all 37 routes generated.
- Calendar tests verified exact file content, Unicode folding, invalid-input
  failure, object-URL cleanup, accessible server rendering, and omission of
  protected links.

## Files

- `apps/web/src/lib/office-hour-calendar.ts`
- `apps/web/src/components/office-hour-calendar-button.tsx`
- `apps/web/src/app/office-hours/page.tsx`
- `apps/web/tests/office-hour-calendar.test.tsx`
- `apps/web/tests/office-hours-page.test.tsx`
- `apps/web/e2e/office-hours-experience.spec.ts`

## Reference Decisions

- Luma's individual iCalendar-file flow informed the one-event download.
- Google Calendar's `.ics` import support confirmed provider portability.
- RFC 5545 allows the known `DTSTART` without requiring Soji to fabricate a
  `DTEND` or `DURATION`.
