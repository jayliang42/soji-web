---
quick_id: 260730-l8d
title: Accessible support request composer
status: complete
completed: 2026-07-30
implementation_commit: 538a3d1
---

# Quick Task Summary

## Outcome

Turned the Support page's static contact checklist into a complete request
preparation flow. Customers can choose an issue type, describe what happened,
add optional account, product, page, or timing context, and review the exact
message before sharing it.

A configured email channel now opens with the issue-specific subject and full
request prefilled. Every prepared request also has a copy action; when browser
clipboard access fails, the page exposes and selects the complete text for
manual copying. Web-based and not-yet-configured channels retain truthful,
actionable paths without saving form data or requiring an account.

## UI and UX

- Extends the existing dark customer-care panel with a responsive request
  builder and a restrained cream preview card.
- Keeps the form in a simple vertical reading order and makes optional context,
  data handling, and prohibited sensitive details explicit.
- Uses field-level validation with focus recovery instead of a detached generic
  error.
- Keeps the request preview content-height and sticky on desktop, stacked on
  narrow screens, and gives every primary control at least a 44px target.
- Uses a focusable scroll region for long requests and an `aria-live` action
  status for prepared, copied, and manual-copy outcomes.

## Verification

- Vitest: 101 files and 711 tests passed.
- Playwright Support matrix: 12 passed and 2 intentional project-specific skips
  across desktop and mobile.
- Prepared-state Axe scan: no serious or critical violations.
- Validation focus, exact mailto subject/body, clipboard success, manual copy,
  and 320px horizontal containment were exercised.
- Typecheck, full ESLint, and `git diff --check`: passed.
- Production build: 37 static/dynamic pages generated successfully.
- Real-browser review: initial and prepared hierarchy, preview density, sticky
  behavior, action clarity, and browser console output were inspected.

## Files

- Added deterministic support-request text and mailto helpers.
- Added the responsive request composer and integrated it below the existing
  self-service and contact guidance.
- Added unit, rendering, and desktop/mobile end-to-end coverage, including a
  stable test-only email destination.

## Reference Decisions

- USWDS form accessibility guidance:
  https://designsystem.digital.gov/components/form/
- GOV.UK textarea and validation guidance:
  https://design-system.service.gov.uk/components/textarea/
- Zendesk prefilled support request guidance:
  https://support.zendesk.com/hc/en-us/articles/4408839114522-Creating-pre-filled-ticket-forms
