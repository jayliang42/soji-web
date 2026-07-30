---
quick_id: 260730-khu
title: Homepage Continue reading
status: complete
completed: 2026-07-30
implementation_commit: 394d003
---

# Quick Task Summary

## Outcome

Added a responsive, device-local Continue reading card to the homepage. It
matches the newest meaningful unfinished reading record against the current
published guide snapshot, shows real progress, and returns the reader to the
stored position from one explicit Resume guide action.

The card stays absent for trivial, completed, damaged, unknown, or unpublished
records. Personalized state is not rendered into server HTML, and ordinary
direct article visits still start at the top. A successful resume removes its
temporary query parameter after scrolling.

## UI and UX

- Positioned the card between homepage outcomes and the starting-point section
  so the original first viewport remains focused.
- Used a native progress element, clear completion text, an explicit
  device-local note, and a full-size action at 320px and larger widths.
- Reused the guide progress visual language for continuity between Home and the
  reading page.
- Followed the continuity patterns documented by Apple Books and Medium while
  keeping Soji's implementation account-free and privacy-preserving.

## Verification

- Vitest: 98 files and 699 tests passed.
- Playwright Continue reading coverage: 5 passed and 1 intentional
  project-specific skip across desktop and mobile.
- Homepage first-viewport coverage: 2 passed.
- Scoped axe scan: no serious or critical violations on the populated card.
- Typecheck, ESLint, and `git diff --check`: passed.
- Production build: 37 static/dynamic pages generated successfully.
- Real-browser review: progress, navigation, resume position, responsive
  composition, and zero warning/error console entries verified.

## Files

- Added the Continue reading matcher, homepage client card, unit tests, and
  desktop/mobile end-to-end tests.
- Extended the shared reading-progress reader and explicit resume behavior.
- Updated homepage data composition and shared progress styling.

## Reference Decisions

- Apple Books: https://support.apple.com/en-euro/guide/books/ibks5f526382/mac
- Medium reading history:
  https://help.medium.com/hc/en-us/articles/224488047-Refine-recommendations
