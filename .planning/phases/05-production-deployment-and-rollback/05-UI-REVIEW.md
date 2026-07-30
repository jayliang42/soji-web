---
phase: 05
slug: production-deployment-and-rollback
status: pass_with_notes
overall_score: 23
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
| Spacing | 4/4 | Mobile targets and card padding follow the 44px/spacing contract; shared membership rules now replace repeated full disclosures inside every plan card. |
| Experience design | 4/4 | Mobile menu focus, Escape recovery, active state, no-overflow behavior, goal-based library entry, search/filter reset, and safe disabled purchase states are automated. |

**Overall: 23/24**

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

### Membership comparison

- Preserved each plan's exact monthly amount, renewal condition, and Account-based
  cancellation path directly beside its action.
- Removed the repeated full Stripe Portal explanation and four policy links from every
  plan card.
- Added one shared `Membership basics` panel after the comparison grid for billing,
  management, cancellation/access behavior, policies, and support.
- Changed plan cards to labeled `article` elements with the plan name as the semantic
  heading, making keyboard and assistive-technology comparison clearer.

## Findings

### UI-01 — Membership comparison density

**Severity:** RESOLVED
**Pillar:** Spacing

Each plan keeps its exact monthly renewal and cancellation path next to the purchase
action. Shared Stripe Portal, paid-period, policy, and support details now appear once
below the comparison grid, reducing repetition without separating price truth from the
decision.

**Verification:** server-rendered pricing tests require all three exact amounts and only
one shared Portal/policy panel. Desktop/mobile browser tests require semantic plan
articles, one main refund-policy link, 44-pixel controls, and no horizontal overflow.

### UI-02 — Catalog failure has little secondary value

**Severity:** WARNING  
**Pillar:** Visuals

When the production content source is unavailable, the library correctly fails closed but
the page becomes mostly empty. The alert is clear, yet a visitor has no public content,
topic overview, or alternate route inside the main section.

**Next iteration:** provide a retry action plus a small static path to Membership or
Support without presenting demo content as live.

### UI-03 — Guest sign-in entry clarified

**Severity:** RESOLVED  
**Pillar:** Experience design

Guests previously reached authentication through `Account`, which was safe but indirect.
The public shell now labels that destination `Sign in`; authenticated readers retain
`Account` and `Subscriptions`.

**Verification:** server-rendered guest/member navigation tests cover the distinct labels,
and the full responsive navigation suite retains active state and target sizing.

## Reference Patterns

- Goalsetter emphasizes a short path from education to action and groups outcomes before
  feature detail: <https://goalsetter.co/>
- Your Juno uses topic-led library discovery to help visitors start from a current money
  question: <https://www.yourjuno.co/>
- Bank Like Her separates learning, membership, and tools as distinct routes rather than
  presenting one undifferentiated feed: <https://www.banklikeher.com/>
- MasterClass separates common membership inclusions from plan-specific device and
  offline-access differences: <https://www.masterclass.com/checkout?gift=true>
- Patreon explains recurring billing and cancellation behavior as one shared membership
  model instead of repeating it for every tier:
  <https://support.patreon.com/hc/en-us/articles/360002355991-How-membership-billing-works>

Soji borrows those information-architecture patterns, not their branding. The visual
system remains Soji's restrained editorial serif, warm neutrals, clay accent, and owned
book imagery.

## Verification Evidence

- Web Vitest: 86 files and 644 tests passed.
- ESLint and generated-route typecheck passed.
- Next.js production build passed and generated 37 routes.
- Focused Playwright membership comparison checks passed 7 tests across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally skipped.
- Focused Playwright navigation/home checks passed 6/6 on desktop and mobile.
- Focused library discovery, keyboard, and axe checks passed 12/12 on desktop and mobile.
- The prior full CI-style Playwright regression remains recorded at 124/124 on desktop
  and mobile.

## Human Review

No additional login is needed for the local UI work. Provider-backed, billing, role, and
canonical production states remain grouped in the existing consolidated owner checkpoint;
this audit does not create another authentication list.
