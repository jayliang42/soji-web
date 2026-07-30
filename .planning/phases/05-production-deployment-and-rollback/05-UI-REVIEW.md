---
phase: 05
slug: production-deployment-and-rollback
status: pass
overall_score: 24
max_score: 24
audited: 2026-07-30
routes:
  - /
  - /pricing
  - /products
  - /products/wealth-dashboard-template-pack
  - /library
  - /library/wealth-without-drift
  - /office-hours
  - /login
  - /account
  - /admin
  - /support
---

# Phase 05 — UI Review

## Verdict

Soji now presents a coherent warm-editorial experience across its public discovery,
membership, and account paths. The strongest improvements in this pass are functional:
mobile navigation is no longer a compressed row of sub-44px links, the homepage explains
a clear read → apply → ask journey, and the library supports goal, format, and keyword
discovery with a useful empty state. Support now routes common customer tasks to their
authoritative account and policy destinations before presenting the contact channel.
Article details now distinguish the public opening from the member edition, surface only
the reading time a visitor can actually access, and lead to the exact qualifying tier.
Admin Overview now links status directly to its owning workspace and lets operators
reduce the 20-item release checklist to the subset relevant to the next task.
Each digital product now has a durable detail page that explains the offer and delivery
before presenting the existing account-aware purchase action.
When Library, Shop, or Office Hours cannot load their collection, the missing catalog is
now replaced by a full editorial recovery panel with one retry, one useful alternate
route, and exact account/access reassurance instead of leaving most of the page blank.

The user explicitly reopened visual and functional iteration after the original Phase 5
UI contract froze Phase 4. This audit therefore retains the contract's truthfulness,
responsive, and accessibility requirements while accepting purposeful UI improvements.

## Scorecard

| Pillar | Score | Evidence |
|--------|------:|----------|
| Copywriting | 4/4 | Headings and actions name the next useful step; the new journey copy explains product architecture without generic labels or inflated financial claims. |
| Visuals | 4/4 | Owned imagery, editorial cards, goal browsing, and the new illustrated catalog recovery panels preserve a recognizable hierarchy even when no live collection can render. |
| Color | 4/4 | Shell, cream, cocoa, clay, and verified-success tones remain token-driven and maintain a controlled neutral/accent distribution. |
| Typography | 4/4 | Display serif headings and sans-serif operational copy retain a strong hierarchy across 320–1440px without introducing a competing type system. |
| Spacing | 4/4 | Mobile targets and card padding follow the 44px/spacing contract; shared membership rules now replace repeated full disclosures inside every plan card. |
| Experience design | 4/4 | Mobile menu focus, Escape recovery, active state, no-overflow behavior, goal-based library entry, task-led support, search/filter reset, and safe disabled purchase states are automated. |

**Overall: 24/24**

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
- Persisted focus, format, and keyword state in compact Library URLs. Filtered views now
  survive reload, can be shared, and restore through browser Back/Forward without
  reloading the catalog.
- Converted visible public topic pills on Library cards and article details into
  44-pixel links that open the matching filtered Library view; internal tags remain
  excluded.
- Improved cover placeholders so catalog items remain visually intentional when they do
  not have an uploaded image.
- Added reusable recovery-action support to unavailable-state cards and enabled it on
  Pricing and Products.
- Replaced sparse Library, Shop, and Office Hours catalog failures with one shared
  editorial recovery panel that names the interruption, preserves one reload action,
  and offers one still-valid alternate route.
- Gave true empty collections a visually related non-error panel with one useful next
  step, while keeping error states semantically distinct through `role="alert"`.
- Suppressed duplicate account-status warnings when the owning catalog is already
  unavailable, so simultaneous failures produce one coherent recovery path.

### Article reading

- Added an editorial title-and-cover hero with an immediate route back to Library.
- Added a guide-details rail for format, publication date, visible reading time, access,
  and public topics while filtering internal fixture tags.
- Added an automatic `In this guide` outline for long visible Markdown bodies, with
  numbered in-page links, stable anchor IDs, and fixed-navigation scroll clearance.
- Built the outline only from the body already authorized for the current reader;
  preview and unavailable states cannot infer or reveal member-only section names.
- Handled duplicate headings, formatted heading labels, Setext headings, and fenced code
  without requiring authors to manage anchor IDs by hand.
- Reframed the preview boundary as a two-part member-edition panel and deep-linked its
  primary action to the exact qualifying tier.
- Added next-step routes for entitled readers after the article without changing content
  access, entitlement, or billing behavior.
- Added a three-card `Keep reading` section that excludes the current article and ranks
  candidates by shared public topics, then content format and recency.
- Reused the Library's access-aware cards with an h3 title level, public catalog fields,
  and exact public/preview/membership labels; related bodies are never rendered into the
  current page and internal fixture tags do not affect recommendations.
- Verified the signed-in preview state and 320/390-pixel touch targets without exposing
  protected copy or introducing horizontal overflow.

### Product details

- Added a shareable `/products/[slug]` route with public metadata, editorial artwork,
  exact price/format labels, included outcomes, and a three-step delivery explanation.
- Linked every Shop card to the matching product detail while retaining the existing
  account-aware purchase action on both surfaces.
- Preserved guest return intent, owner access, dispute review, catalog failure, purchase
  history failure, and billing-unavailable behavior without creating a parallel checkout.
- Kept the purchase disclosure beside the action and verified 320/390-pixel controls,
  semantic hierarchy, and no horizontal overflow.
- Strengthened the Shop outcome eyebrow and product-detail purchase eyebrow from
  `cocoa/60` to `cocoa/70`, clearing the 4.36:1 contrast finding for 12-pixel text.
- Added the product-specific route to the shared serious/critical axe page matrix so
  both catalog and detail typography remain covered on desktop and mobile.

### Durable Shop discovery

- Persisted Shop search, use, and price-sort state in compact `/products` URLs.
- Restored all three controls before hydration after reload and through browser
  Back/Forward navigation without refetching the product catalog.
- Preserved unrelated checkout-result parameters while changing or clearing filters, so
  a cancelled-purchase notice is not silently removed by catalog browsing.
- Retained the existing result count, no-result recovery, purchase-state authority,
  44-pixel controls, and zero-overflow behavior at 320 and 390 pixels.

### Admin operations

- Added a permission-aware workspace guide for Content, Products, Office Hours, Users,
  and Billing, using current snapshot counts where they help the operator orient.
- Turned the long launch checklist into Open, Needs work, Confirm, Ready, and All views;
  unresolved work remains the default and result changes are announced.
- Increased every sticky Admin section link to the shared 44-pixel minimum target.
- Kept metrics, readiness status, role authority, and operational actions unchanged while
  making the route from observation to the owning workspace explicit.

### Membership comparison

- Preserved each plan's exact monthly amount, renewal condition, and Account-based
  cancellation path directly beside its action.
- Removed the repeated full Stripe Portal explanation and four policy links from every
  plan card.
- Added one shared `Membership basics` panel after the comparison grid for billing,
  management, cancellation/access behavior, policies, and support.
- Changed plan cards to labeled `article` elements with the plan name as the semantic
  heading, making keyboard and assistive-technology comparison clearer.

### Support help paths

- Replaced the long policy-first Support reading flow with four large task cards for
  account recovery, membership/billing, purchases/downloads, and refund review.
- Each card routes to an existing source-of-truth page; no empty help articles or
  duplicate account states were introduced.
- Contact remains a second step and renders a clear configured or unavailable state.
- Library, Office Hours, and policy navigation remain available for adjacent needs.

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

**Severity:** RESOLVED
**Pillar:** Visuals

Library, Shop, and Office Hours now replace an unavailable collection with a substantial
two-part recovery panel: direct explanation and account-safe reassurance on the left,
plus a Soji-owned collection motif on the right. Each state provides one native reload
and one alternate public route without presenting demo content as live.

**Verification:** a provider-free local runtime proves the actual server-rendered
failure states. Desktop, 390-pixel, and 320-pixel Playwright checks require the exact
retry/alternate actions, one matching recovery alert, 44-pixel mobile targets, zero
horizontal overflow, and no serious or critical axe findings.

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
- Ghost places membership support alongside account and subscription management:
  <https://ghost.org/help/customize-portal/>
- Skillshare groups help by Billing & Payments and Managing Your Account before contact:
  <https://help.skillshare.com/hc/en-us>
- Patreon sends product delivery and receipt questions to the Purchases and Billing
  history views:
  <https://support.patreon.com/hc/en-us/articles/16494151075981-My-purchases>
- Ghost separates a public opening from member-only article content and places the
  membership prompt after that boundary:
  <https://ghost.org/help/public-previews/>
- Patreon likewise supports placing useful free article content above the paywall before
  the locked continuation:
  <https://support.patreon.com/hc/en-us/articles/115004048046-Posting-to-your-Patreon>
- Stripe's Dashboard pairs an at-a-glance Home view with direct navigation to the
  resources and integration-health areas that own follow-up work:
  <https://docs.stripe.com/dashboard/basics>
- Ghost Admin keeps content creation, preview, filtering, and organization together in
  the content-management workspace:
  <https://ghost.org/help/organizing-content/>
- Gumroad gives each digital product a unique URL and combines its description, price,
  additional details, call to action, and delivered content:
  <https://gumroad.com/help/article/149-adding-a-product>
- Gumroad's returning-buyer experience changes a product page from purchase to owned
  content access, matching Soji's existing Account route:
  <https://gumroad.com/help/article/199-how-do-i-access-my-purchase>
- Lemon Squeezy treats single-payment products, storefront presentation, and durable
  digital delivery as parts of one product model:
  <https://docs.lemonsqueezy.com/help/products>
- Adobe Spectrum recommends showing what happened and a simple path forward inside the
  error state, such as retry or go back:
  <https://spectrum.adobe.com/page/writing-for-errors/>
- Carbon's empty-state pattern recommends explaining the missing space and placing a
  direct primary action beside the guidance:
  <https://carbondesignsystem.com/patterns/empty-states-pattern/>
- Ghost recommends automatically generated tables of contents so readers can preview a
  post's structure and navigate directly to sections:
  <https://ghost.org/tutorials/adding-table-of-contents/>
- W3C WAI identifies headings as both content structure and a mechanism assistive
  technologies can use for in-page navigation:
  <https://www.w3.org/WAI/tutorials/page-structure/headings/>
- Ghost's official read-next pattern excludes the current post, limits the result set,
  and recommends related posts through shared tags:
  <https://ghost.org/tutorials/read-next/>
- Ghost keeps internal tags out of reader-facing tag output by default, matching Soji's
  separation between editorial topics and fixture taxonomy:
  <https://ghost.org/docs/themes/helpers/tags/>
- Ghost gives each public tag its own content-collection URL and links post topics to
  those durable archives:
  <https://ghost.org/help/tags/>
- Next.js supports native `pushState` and `replaceState` for filter state that updates
  the URL without reloading and remains integrated with App Router navigation:
  <https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api>

Soji borrows those information-architecture patterns, not their branding. The visual
system remains Soji's restrained editorial serif, warm neutrals, clay accent, and owned
book imagery.

## Verification Evidence

- Web Vitest: 93 files and 675 tests passed.
- ESLint and generated-route typecheck passed.
- Next.js production build passed and generated 37 routes.
- Focused Playwright membership comparison checks passed 7 tests across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally skipped.
- Focused Playwright Support checks passed 3 tests across desktop and mobile; one
  desktop-only instance of the narrow-width check was intentionally skipped.
- Focused Playwright Reading checks passed 3 tests across desktop and mobile; one
  desktop-only instance of the narrow-width check was intentionally skipped.
- Focused Playwright Admin Overview checks passed 3 tests across desktop and mobile; one
  desktop-only instance of the narrow-width check was intentionally skipped.
- Focused Playwright Product Detail checks passed 3 tests across desktop and mobile; one
  desktop-only instance of the narrow-width check was intentionally skipped.
- Focused Shop and Product Detail axe checks passed 4/4 across desktop and mobile after
  correcting the small-label contrast.
- Focused durable Shop discovery checks passed 7 tests across desktop and mobile,
  covering search persistence, price sorting, reset, Back restoration, and narrow
  layouts; one desktop-only mobile check was intentionally skipped.
- Focused Playwright catalog recovery checks passed 7 tests across desktop, 390-pixel,
  and 320-pixel views; one desktop-only instance of the mobile-only check was
  intentionally skipped.
- Existing cross-workflow acceptance checks passed 16/16, including all six Admin
  workspaces and the new product-detail route at 320, 375, 768, 1024, and 1440 pixels,
  plus the blocking axe scan.
- Focused Playwright navigation/home checks passed 6/6 on desktop and mobile.
- Focused durable Library discovery checks passed 8/8 on desktop and mobile.
- Focused Library and article keyboard/axe checks passed 6/6 on desktop and mobile.
- The prior full CI-style Playwright regression remains recorded at 124/124 on desktop
  and mobile.

## Human Review

No additional login is needed for the local UI work. Provider-backed, billing, role, and
canonical production states remain grouped in the existing consolidated owner checkpoint;
this audit does not create another authentication list.

The Shop empty collection and full connection-paused recovery panel were visually
reviewed in the local browser. The provider-free Library, Shop, and Office Hours states
were then checked at desktop, 390-pixel, and 320-pixel widths through the focused suite,
including target size, overflow, semantics, and blocking accessibility findings.

The complete eight-section member guide was also reviewed in a temporary local Tier 1
Demo state. The outline and body headings matched one for one, an in-page click produced
the expected URL fragment and 112-pixel top clearance, and the desktop article/aside
composition had no horizontal overflow. Restoring the normal free Demo user confirmed
that the public opening does not render the hidden outline; the temporary tier change was
not committed.

The related-reading section was reviewed in the normal signed-in preview state. Its
three cards were equal-height at desktop, every action remained at least 44 pixels high,
the document retained zero horizontal overflow, and the public recommendation opened its
correct durable article URL. DOM inspection confirmed that none of the related article
bodies was included on the current page; the focused Reading suite then passed on desktop
and mobile, including explicit 320- and 390-pixel checks.

The public `family` topic was followed from the article rail into
`/library?q=family`. The search control and result count matched immediately, the query
survived reload, and adding the Article format produced a compact combined URL. Browser
Back restored the prior focus while preserving the remaining query and format controls;
all topic links remained 44 pixels high and the desktop document retained zero horizontal
overflow.
