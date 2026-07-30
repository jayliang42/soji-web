---
quick_id: 260730-lmi
title: Polished responsive global navigation
status: complete
completed: 2026-07-30
implementation_commit: e1b33b7
---

# Quick Task Summary

## Outcome

Upgraded Soji's shared navigation into a clearer publication-wide wayfinding
system. Desktop navigation now separates quiet editorial destinations from the
account action, shows the current section precisely, and remains available
while a long page scrolls.

On mobile, the old compact disclosure now opens an intentional, scrollable
drawer with short destination context. It closes after navigation, outside
action, Escape, or a desktop resize; preserves the page's scroll position; and
restores focus predictably.

## UI and UX

- Adds the `WELL ENDOWED` publication label without competing with the Soji
  wordmark.
- Gives the account or sign-in destination a distinct rounded action treatment
  while keeping content destinations visually quiet.
- Adds a dimmed full-viewport backdrop, compact drawer introduction, clear
  destination descriptions, and at least 44px mobile targets.
- Keeps all destinations reachable in a 320 by 480 viewport with bounded
  internal scrolling and no horizontal overflow.
- Uses native links and list semantics, enters the first destination on open,
  restores focus on dismissal, and locks only body scrolling while open.
- Distinguishes `/account?view=subscriptions` from the general Account
  destination so only the requested subsection is announced as current.

## Verification

- Vitest: 101 files and 712 tests passed.
- Focused Playwright navigation matrix: 6 passed with 4 intentional
  project-specific skips.
- Existing public-page navigation and horizontal-overflow matrix: 20 passed
  across desktop and mobile.
- Axe scan of the open 320px drawer: no serious or critical violations.
- Escape, backdrop, route selection, focus restoration, body-scroll cleanup,
  sticky positioning, and active-account subsection behavior were exercised.
- Full ESLint, typecheck, and `git diff --check`: passed.
- Production build: 37 static/dynamic pages generated successfully.
- Real-browser review confirmed the desktop hierarchy and sticky behavior with
  no application errors in the browser console.

## Reference Decisions

- Ghost navigation and Source theme patterns informed the quiet publication
  links and distinct account action:
  https://ghost.org/help/updating-navigation/
  https://ghost.org/themes/source/
- GOV.UK service navigation informed the named native navigation region and
  explicit mobile disclosure:
  https://design-system.service.gov.uk/components/service-navigation/
- W3C disclosure navigation and focus-order guidance informed ordinary link
  semantics, Escape handling, and focus restoration:
  https://www.w3.org/TR/2021/NOTE-wai-aria-practices-1.2-20211129/examples/disclosure/disclosure-navigation.html
  https://www.w3.org/WAI/WCAG22/Understanding/focus-order
