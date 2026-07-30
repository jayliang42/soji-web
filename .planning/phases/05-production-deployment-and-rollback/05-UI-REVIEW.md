---
phase: 05
slug: production-deployment-and-rollback
status: pass_with_notes
overall_score: 22
max_score: 24
audited: 2026-07-30
routes:
  - /
  - /pricing
  - /products
  - /library
  - /office-hours
  - /login
  - /account
---

# Phase 05 — UI Review

## Verdict

Soji now presents a coherent warm-editorial experience across its public discovery,
membership, and account paths. The strongest improvements in this pass are functional:
mobile navigation is no longer a compressed row of sub-44px links, the homepage explains
a clear read → apply → ask journey, and the library supports goal, format, and keyword
discovery with a useful empty state.

The user explicitly reopened visual and functional iteration after the original Phase 5
UI contract froze Phase 4. This audit therefore retains the contract's truthfulness,
responsive, and accessibility requirements while accepting purposeful UI improvements.

## Scorecard

| Pillar | Score | Evidence |
|--------|------:|----------|
| Copywriting | 4/4 | Headings and actions name the next useful step; the new journey copy explains product architecture without generic labels or inflated financial claims. |
| Visuals | 3/4 | The owned book hero, editorial cards, goal browser, and restrained imagery create a recognizable system. Degraded data states still become visually sparse when no catalog content can render. |
| Color | 4/4 | Shell, cream, cocoa, clay, and verified-success tones remain token-driven and maintain a controlled neutral/accent distribution. |
| Typography | 4/4 | Display serif headings and sans-serif operational copy retain a strong hierarchy across 320–1440px without introducing a competing type system. |
| Spacing | 3/4 | Mobile targets and card padding now follow the 44px/spacing contract. Membership cards remain vertically dense because exact renewal and policy terms repeat per plan. |
| Experience design | 4/4 | Mobile menu focus, Escape recovery, active state, no-overflow behavior, goal-based library entry, search/filter reset, and safe disabled purchase states are automated. |

**Overall: 22/24**

## Implemented Improvements

### Global navigation

- Replaced the compressed 320–390px five-link row with a clear Menu control.
- Every mobile destination has a minimum 44px target.
- Opening the menu focuses the first destination; Escape closes it and restores focus.
- Desktop navigation remains visible and keeps the active-section underline.

### Homepage

- Added a three-step `Read`, `Apply`, `Ask` journey that maps directly to Library,
  Products, and Office Hours.
- Linked the reading path to the library's `focus=start` state.
- Added a concise educational-information boundary beside the journey rather than
  interrupting the hero.
- Replaced the ambiguous featured-plan badge `Core` with `Most popular`.

### Library and recovery

- Added goal chips, keyword search, format filtering, live result counts, clear filters,
  and a one-action empty state.
- Improved cover placeholders so catalog items remain visually intentional when they do
  not have an uploaded image.
- Added reusable recovery-action support to unavailable-state cards and enabled it on
  Pricing and Products.

## Findings

### UI-01 — Membership comparison remains vertically dense

**Severity:** WARNING  
**Pillar:** Spacing

Each plan correctly keeps its exact monthly renewal, cancellation, and policy terms next
to the purchase action, but repeating four policy links and the full portal explanation
inside every card makes comparison slower below the entitlement lists.

**Next iteration:** preserve the exact per-plan amount and cancellation sentence, then
test a shared policy-link rail immediately below the grid if legal/acceptance requirements
permit it.

### UI-02 — Catalog failure has little secondary value

**Severity:** WARNING  
**Pillar:** Visuals

When the production content source is unavailable, the library correctly fails closed but
the page becomes mostly empty. The alert is clear, yet a visitor has no public content,
topic overview, or alternate route inside the main section.

**Next iteration:** provide a retry action plus a small static path to Membership or
Support without presenting demo content as live.

### UI-03 — Guest `Account` label is accurate but indirect

**Severity:** WARNING  
**Pillar:** Experience design

Guests reach authentication through `Account`, which is safe and consistent, but a
first-time visitor may not predict that it is the sign-in entry.

**Next iteration:** test `Sign in` as the guest label while retaining `Account` for
authenticated users, then verify the change against acquisition and account UAT.

## Reference Patterns

- Goalsetter emphasizes a short path from education to action and groups outcomes before
  feature detail: <https://goalsetter.co/>
- Your Juno uses topic-led library discovery to help visitors start from a current money
  question: <https://www.yourjuno.co/>
- Bank Like Her separates learning, membership, and tools as distinct routes rather than
  presenting one undifferentiated feed: <https://www.banklikeher.com/>

Soji borrows those information-architecture patterns, not their branding. The visual
system remains Soji's restrained editorial serif, warm neutrals, clay accent, and owned
book imagery.

## Verification Evidence

- Web Vitest: 82 files and 632 tests passed.
- ESLint and generated-route typecheck passed.
- Next.js production build passed and generated 37 routes.
- Focused Playwright navigation/home checks passed 6/6 on desktop and mobile.
- Focused library discovery, keyboard, and axe checks passed 12/12 on desktop and mobile.
- Full CI-style Playwright regression passed 124/124 on desktop and mobile.

## Human Review

No additional login is needed for the local UI work. Provider-backed, billing, role, and
canonical production states remain grouped in the existing consolidated owner checkpoint;
this audit does not create another authentication list.
