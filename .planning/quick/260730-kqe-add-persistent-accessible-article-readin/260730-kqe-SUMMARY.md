---
quick_id: 260730-kqe
title: Persistent article reading size
status: complete
completed: 2026-07-30
implementation_commit: 48a24e4
---

# Quick Task Summary

## Outcome

Added a compact Default/Larger text-size control to every guide with visible
body content. The preference applies only to editorial prose, persists on the
current device without an account, and synchronizes across open Soji tabs.

Blocked or unavailable browser storage does not break the reader: the chosen
size still applies for the current visit and the live announcement truthfully
explains that it was not saved. Unknown stored values fall back to the default.

## UI and UX

- Kept two plainly labeled choices in the reading header instead of exposing a
  complex appearance panel.
- Increased guide prose from 18px/32.4px to 21px/38.85px while leaving
  navigation, metadata, controls, and product UI at their existing scale.
- Preserved 44px targets, keyboard focus, selected-state semantics, and a
  no-overflow layout at the 320px boundary.
- Re-measures reading progress after text reflow so saved progress and Resume
  remain compatible with the larger setting.

## Verification

- Vitest: 99 files and 703 tests passed.
- Focused unit regressions: 13 passed.
- Playwright reading-size and progress matrix: 8 passed and 2 intentional
  project-specific skips across desktop and mobile.
- Scoped axe scan: no serious or critical violations.
- Typecheck, ESLint, and `git diff --check`: passed.
- Production build: 37 static/dynamic pages generated successfully.
- Real-browser review: both text sizes, selected states, hierarchy, reflow, and
  desktop overflow were inspected; 320px behavior passed the mobile project.

## Files

- Added bounded reading-size storage helpers, the accessible client control,
  component tests, and desktop/mobile end-to-end coverage.
- Added guide-prose sizing and ResizeObserver-backed progress remeasurement.
- Corrected the short-preview progress test to cross the reading start
  boundary before expecting completion.

## Reference Decisions

- Apple Books reading appearance:
  https://support.apple.com/guide/iphone/read-books-iphc1af7c57/26/ios/26
- Safari per-site text sizing:
  https://support.apple.com/en-ca/guide/iphone/-iphb3100d149/ios
