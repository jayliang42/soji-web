---
quick_id: 260730-l0n
title: Responsive current-section guide navigation
status: complete
completed: 2026-07-30
implementation_commit: 24c630a
---

# Quick Task Summary

## Outcome

Upgraded guide contents from a static jump list into progressively enhanced
reading wayfinding. Ordinary fragment links remain in the server HTML, while
hydrated pages mark the section that has crossed the reading line with
`aria-current="location"` and a restrained visual current state.

Narrow screens now receive a native collapsible contents list before the prose
instead of finding the only outline after the article. Desktop keeps the full
outline in the sticky guide-details rail. Direct section fragments, scrolling,
and text-size reflow all resolve to the same current location.

## UI and UX

- Uses the existing numbered outline and cream/shell palette rather than adding
  a floating widget or motion-heavy scroll effect.
- Keeps all links at least 44px tall and preserves the 112px heading landing
  offset beneath the persistent header.
- Shows a section count before mobile reading begins and the current section
  label after progress is established.
- Added semantic headings to the public First Money Audit so the free starter
  guide demonstrates real section navigation.

## Verification

- Vitest: 100 files and 706 tests passed.
- Focused outline, article, and Markdown regressions: 9 passed.
- Playwright outline, reading-size, and reading-experience matrix: 13 passed
  and 3 intentional project-specific skips across desktop and mobile.
- Scoped mobile axe scan: no serious or critical violations.
- Typecheck, ESLint, and `git diff --check`: passed.
- Production build: 37 static/dynamic pages generated successfully.
- Real-browser review: current states, direct fragment position, sticky-rail
  density, link hierarchy, and horizontal containment were inspected.

## Files

- Added the responsive GuideOutline component and deterministic section
  selection helper.
- Replaced the static desktop list and added the mobile pre-reading disclosure.
- Added public-guide structure plus unit and desktop/mobile end-to-end coverage.

## Reference Decisions

- web.dev table-of-contents semantics:
  https://web.dev/learn/html/navigation?hl=en
- GOV.UK current navigation semantics:
  https://design-system.service.gov.uk/components/service-navigation/
