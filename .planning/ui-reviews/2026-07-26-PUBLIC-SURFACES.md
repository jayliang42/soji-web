---
date: 2026-07-26
scope: public-surfaces
status: pass_after_fix
score: 24
max_score: 24
---

# Public Surfaces UI/UX Follow-up

## Scope

Manual desktop and 375×812 mobile review covered:

- `/`
- `/pricing`
- `/products`
- `/library`
- `/library/march-2026-update-pack`
- `/office-hours`

The review used the GSD six-pillar rubric and compared Soji's information
hierarchy with current editorial and membership patterns from:

- [Every sign-in](https://every.to/login): one bounded task with minimal
  surrounding distraction.
- [Substack sign-in](https://substack.com/sign-in): direct account switching
  and a deliberately short authentication path.
- [MasterClass login](https://www.masterclass.com/auth/login): a strong brand
  shell around membership entry.
- [Membership.io Library](https://membership.io/library): benefit-led content
  organization and explicit library wayfinding.

Soji should retain its quieter editorial identity rather than importing the
denser promotional navigation or larger provider stacks from those products.

## Scorecard After Fix

| Pillar | Score | Evidence |
|--------|------:|----------|
| Copywriting | 4/4 | Public headings are benefit-led and internal access identifiers remain absent. |
| Visuals | 4/4 | The hero, pricing grid, product empty state, library cards, and office-hours cards share a restrained editorial composition. |
| Color | 4/4 | Neutral surfaces and clay accents remain consistent across all reviewed routes. |
| Typography | 4/4 | Display headings and sans-serif support copy preserve hierarchy on desktop and mobile. |
| Spacing | 4/4 | Reviewed routes have no horizontal overflow and maintain readable card gutters. |
| Experience design | 4/4 | Reader-facing content metadata is now readable, consistent, and semantically marked up. |

**Overall: 24/24 after the metadata fix.**

## Finding 36 — Storage metadata leaked into reader-facing cards

Severity: MEDIUM

Library cards rendered raw ISO timestamps such as
`2026-07-19T21:47:56.62735+00:00`, while content-detail eyebrows rendered the
storage enum `monthly_update`. Both values exposed implementation details and
disrupted the editorial rhythm.

Change made:

- Added deterministic, UTC-based short dates such as `Jul 19, 2026`.
- Rendered dates with semantic `<time datetime="…">` markup.
- Converted storage enums to reader-facing labels such as `Monthly update` and
  `Case study`.
- Hid malformed date metadata instead of printing an unreadable raw value.
- Centralized the presentation rules so list and detail views cannot drift.

## Verification

- 435/435 web Vitest tests passed across 76 files.
- Web typecheck passed.
- Web lint passed.
- 36/36 isolated Playwright checks passed across desktop and mobile:
  accessibility, horizontal overflow, and customer-facing identifier leakage.
- Manual browser inspection confirmed the corrected labels on the library list
  and content-detail route at desktop and 375×812 mobile sizes.

An initial Playwright attempt reused the developer server and produced two
expected Demo-account fixture mismatches. The isolated test server rerun passed
all 36 checks; no product assertion failed.
