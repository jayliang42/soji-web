---
phase: 04
slug: experience-and-operations-acceptance
status: pass_with_notes
overall_score: 23
max_score: 24
audited: 2026-07-30
routes:
  - /
  - /account
  - /admin
  - /library
  - /library/wealth-without-drift
  - /library?focus=family
  - /login
  - /office-hours
  - /pricing
  - /products
  - /products/wealth-dashboard-template-pack
  - /reset-password
  - /support
---

# Phase 04 UI Review

## Verdict

Phase 04 passes the UI quality gate. The public experience has a clear visual
hierarchy, consistent editorial styling, responsive layouts, and accessible
interaction targets. The main discovery gap identified in the library has been
resolved with goal-led navigation, search, filtering, result feedback, and
recovery states. The authenticated Account experience now provides equivalent
wayfinding and next-step clarity without changing billing authority. Office
Hours now explains its participation model before presenting lifecycle-aware
session and replay states. Membership pricing now begins with a need-led plan
finder that recommends a starting tier without changing price or checkout
behavior. The standalone Shop now supports need-led browsing, full-text
search, price sorting, and clear no-result recovery while retaining the
existing purchase-state authority. The homepage now separates browsing,
one-time tools, membership, and live guidance into four explicit starting
paths and keeps transaction-specific actions on their authoritative pages.
The sign-in entry now adapts to the task that brought a visitor there, states
the post-authentication destination, and presents password recovery as a
focused step instead of an immediate side effect of the sign-in form.
Support now begins with direct account, subscription, purchase, and refund
paths before asking a customer to open the published contact channel. Article
detail pages now provide an editorial reading frame, visible-content reading
time, guide metadata, and an exact membership path after the public opening.
Admin Overview now turns catalog status into direct, permission-aware
workspaces and makes the long release checklist filterable by operator task.
Shop products now have durable detail URLs that explain contents, delivery,
purchase terms, and the current account-specific action before Checkout.

The remaining note is operational rather than a local UI defect: authenticated
production-provider states still require the consolidated owner checkpoint
before they can be visually confirmed against live accounts.

## Scorecard

| Pillar | Score | Evidence |
| --- | ---: | --- |
| Copywriting | 4/4 | Outcome-led language, clear labels, and direct recovery actions |
| Visuals | 4/4 | Editorial fallback covers replace generic placeholders and preserve hierarchy |
| Color | 4/4 | Warm neutral palette and accent colors remain consistent across routes and states |
| Typography | 4/4 | Display and body roles are distinct, readable, and responsive |
| Spacing | 4/4 | Compact discovery controls and card grids maintain rhythm without overflow |
| Experience design | 3/4 | Local discovery flow is complete; live provider states await owner validation |

## Route Findings

### Home (`/`)

- The existing hero and editorial sections remain the strongest entry point.
- Outcome cards now link directly into relevant library focus views, reducing
  the distance between a visitor's goal and useful content.
- A four-card starting-point matrix now distinguishes free previews, one-time
  tools, recurring membership, and guided Office Hours by both purpose and
  commitment.
- The former full checkout-capable plan grid has been replaced by a compact
  membership overview that links to the Plan Finder, complete comparison, and
  each exact tier.
- Signed-in visitors no longer encounter `Create account to join` actions on
  the homepage; account and checkout behavior remains on Pricing.
- Desktop and mobile layouts preserve readable measure and touch targets.

### Library (`/library`)

- Search, format filtering, and goal-based focus chips provide multiple
  discovery paths without exposing protected content bodies.
- Result counts update as filters change and are announced through an
  `aria-live` region.
- Empty results include a direct reset action.
- Featured cards use a two-column editorial layout on large screens.
- Generated editorial covers distinguish content types when a custom image is
  unavailable.
- Internal fixture tags such as `demo` and `supporting` are not presented to
  visitors.

### Focused library (`/library?focus=family`)

- Deep links initialize the relevant focus state.
- Filter controls wrap without horizontal overflow on narrow screens.
- Interactive controls meet the 44-pixel minimum target size.

### Library detail (`/library/[slug]`)

- An editorial two-column hero now pairs the article title and summary with its
  owned cover, while a visible Back to Library action restores orientation.
- Reading time is calculated only from the body actually delivered to the
  current visitor; protected text is never inferred or exposed through the
  estimate.
- A sticky guide-details rail groups format, publication date, access level,
  visible reading time, and public topics without showing internal fixture
  tags.
- Long visible guides now generate an `In this guide` navigation from their
  Markdown headings, with numbered links and stable section anchors that stop
  below the fixed site navigation.
- Duplicate headings receive deterministic suffixes, fenced-code examples are
  excluded, and previews never expose titles from the hidden member body.
- After a public opening, the access panel links directly to the exact included
  membership tier and the reader's Account while preserving the existing
  entitlement decision.
- Fully entitled readers receive bounded next steps to more guides, practical
  tools, and Office Hours after the article rather than a generic dead end.
- Every article can now continue into as many as three related pieces, ranked
  first by shared public topics and then by format and recency. Internal fixture
  tags never influence the ranking.
- Related cards expose only catalog metadata, use the same access labels as the
  Library, and retain an h3 title beneath the section heading; no related body
  or preview copy is rendered into the current article.
- Desktop, 390-pixel, and 320-pixel layouts preserve the reading hierarchy,
  44-pixel actions, and zero horizontal overflow.

### Account (`/account`)

- A four-link section navigator makes the long account surface easier to scan
  and provides direct access to overview, membership, purchases, and profile.
- The account overview groups current tier, active benefits, and useful next
  actions into three visually distinct cards.
- Subscription truth, purchase delivery, and degraded-state behavior remain
  unchanged while their sections use clearer bounded panels.
- The empty purchase state explains what will appear and offers a direct route
  to practical tools.
- The loading skeleton now mirrors the three-card overview and panel geometry,
  reducing layout shift during account retrieval.

### Admin (`/admin`)

- A five-card workspace guide now converts catalog counts into direct Content,
  Products, Office Hours, Users, and Billing operations.
- Editor and Admin destinations remain permission-aware; restricted cards state
  the required role instead of presenting an unusable action.
- The 20-item release checklist opens on unresolved work and can be filtered by
  needs-work, confirmation, ready, or complete views with live result feedback.
- Existing status truth and source data remain unchanged; the update only
  improves navigation, prioritization, and scanability.
- The six sticky workspace tabs and all overview actions maintain 44-pixel
  targets with no horizontal overflow at 320 and 390 pixels.

### Login and recovery (`/login`, `/reset-password`)

- A direct visit to Login now describes the Account destination that the
  existing safe-return behavior actually uses.
- Library, membership, product, Office Hours, Account, password-recovery, and
  Admin destinations each receive task-specific sign-in copy; query strings
  and anchors no longer erase the relevant intent.
- Guest visitors see the destination, a three-step account journey, and a
  public-library alternative before authenticating.
- `Forgot password?` now opens a focused email-only recovery step, preserves
  the entered email, moves keyboard focus to the new heading, and provides a
  clear return to sign in.
- An expired or incomplete recovery callback opens the recovery step directly
  and explains that no password was changed.
- Existing email, Google, sign-up, recovery, redirect, and safe-failure
  mechanics remain unchanged.
- Recovery controls maintain 44-pixel targets with no horizontal overflow at
  both 320- and 390-pixel widths.

### Office Hours (`/office-hours`)

- A three-step participation model explains how to prepare without promising
  individualized advice.
- Upcoming, replay, pending, and unavailable cards use distinct editorial
  treatments while preserving the existing lifecycle and entitlement
  projection.
- Date badges, explicit Central Time labels, access copy, and bounded actions
  make each session easier to scan.
- Upcoming sessions include a clipboard action for copying only the public
  title and date; protected signup and replay destinations remain outside the
  copied summary.
- The bottom preparation panel gives both a library-first and a
  membership-comparison next step.

### Membership (`/pricing`)

- A plan finder now precedes the longer comparison cards, giving visitors a
  concrete decision path before asking them to compare every entitlement.
- The three need-led choices map a calmer monthly rhythm, full working library,
  and live guided support to Tier 1, Tier 2, and Tier 3 respectively.
- Each result repeats the exact monthly price, explains the recommendation,
  and deep-links to the corresponding full plan card.
- Each plan remains a labeled semantic article and keeps its exact monthly
  renewal and cancellation path beside the action.
- One shared membership-basics panel now holds Portal management, paid-period,
  policy, and support details that are identical across all plans, replacing
  three repeated full disclosure blocks.
- The recommendation remains optional and does not change the listed price,
  billing availability, checkout path, or account requirements.
- Finder controls maintain 44-pixel touch targets without horizontal overflow
  at both 320- and 390-pixel widths.

### Shop (`/products`)

- A compact catalog workspace now lets visitors search titles, summaries, and
  included outcomes, browse by `Track & review` or `Talk & decide`, and sort
  one-time tools by price.
- Result counts update through an `aria-live` region, active use filters expose
  pressed state, and a no-result panel offers one direct reset action.
- Product cards use differentiated editorial cover treatments, one-time price
  badges, outcome-led feature lists, and explicit delivery/account/subscription
  metadata before the existing purchase action.
- Small uppercase outcome labels now use a stronger cocoa tone; the Shop no
  longer carries the 4.36:1 text-contrast finding exposed by the axe scan.
- Search and focus filtering work together without changing product,
  purchase-history, checkout-readiness, or account-access behavior.
- Search, sort, filter, and recovery controls maintain 44-pixel targets with no
  horizontal overflow at 320- and 390-pixel widths.

### Cross-catalog recovery

- Library, Shop, and Office Hours now replace a fully unavailable collection with
  one shared editorial recovery panel instead of a narrow warning followed by a
  mostly empty page.
- Each panel states what could not load, provides a native reload action, explains
  what remains unchanged, and offers one still-valid public destination.
- Simultaneous catalog and account-status failures collapse into the owning catalog
  recovery state rather than stacking two competing alerts.
- True empty collections retain a visually related but non-error panel with one
  useful next step; unavailable states remain explicit `role="alert"` regions.
- The recovery and alternate actions remain at least 44 pixels high with no
  horizontal overflow at 320 and 390 pixels.

### Product detail (`/products/[slug]`)

- Every catalog card now leads to a shareable product-specific page rather
  than asking a visitor to decide from a compact listing alone.
- The editorial hero repeats the exact one-time price, digital format, and
  no-subscription condition beside differentiated product artwork.
- Included outcomes and the sign-in → pay once → Account delivery path appear
  before a sticky purchase panel with the existing policy disclosure.
- Guest authentication returns to the exact product; verified owners return to
  Account, disputed owners retain the review path, and unavailable catalog or
  purchase state never exposes a new Checkout action.
- Product-specific metadata uses only public catalog fields, while the page
  preserves 44-pixel controls and zero overflow at 320 and 390 pixels.
- The product-specific route is now included in the shared serious/critical
  axe regression alongside the Shop listing.

### Support (`/support`)

- Four task cards route account access, subscriptions, purchases/downloads, and
  refund review to the existing authoritative page instead of making customers
  read policy prose before taking action.
- Contact Support appears after the self-service routes and handles both the
  configured-channel and not-yet-configured states without inventing a response
  time.
- A concise three-item checklist explains what makes a request actionable while
  public Library and Office Hours paths remain available for non-support needs.
- All five policy routes remain reciprocally linked from the page.
- Full-card links, secondary routes, and policy links maintain 44-pixel targets
  with no horizontal overflow at 320- and 390-pixel widths.

## Validation

- Production build: passed, including all 37 generated routes and endpoints.
- Unit tests: 93 files, 670 tests passed.
- ESLint: passed.
- TypeScript route generation and typecheck: passed.
- Targeted Playwright discovery suite: 6 tests passed across desktop and mobile.
- Targeted Playwright Account suite: 5 tests passed across desktop and mobile;
  one desktop-only instance of the mobile touch-target check was intentionally
  skipped.
- Targeted Playwright Office Hours suite: 5 tests passed across desktop,
  390-pixel, and 320-pixel views; one desktop-only instance of the mobile
  touch-target check was intentionally skipped.
- Targeted Playwright Membership suite: 7 tests passed across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally
  skipped.
- Targeted Playwright Shop suite: 7 tests passed across desktop and mobile; one
  desktop-only instance of the narrow-width check was intentionally skipped.
- Targeted Playwright Home decision suite: 5 tests passed across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally
  skipped.
- Targeted Playwright Auth Entry suite: 7 tests passed across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally
  skipped.
- Targeted Playwright Support suite: 3 tests passed across desktop and mobile;
  one desktop-only instance of the narrow-width check was intentionally skipped.
- Targeted Playwright Reading suite: 3 tests passed across desktop and mobile;
  one desktop-only instance of the narrow-width check was intentionally skipped.
- Targeted Playwright Admin Overview suite: 3 tests passed across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally
  skipped.
- Targeted Playwright Product Detail suite: 3 tests passed across desktop and
  mobile; one desktop-only instance of the narrow-width check was intentionally
  skipped.
- Targeted Shop and Product Detail axe checks: 4 tests passed across desktop
  and mobile after the small-label contrast correction.
- Targeted Playwright Catalog Recovery suite: 7 tests passed across desktop,
  390-pixel, and 320-pixel views; one desktop-only instance of the mobile-only
  check was intentionally skipped.
- Existing cross-workflow acceptance suite: 16 tests passed, covering every
  Admin workspace at 320, 375, 768, 1024, and 1440 pixels plus accessibility.
- Manual browser review: home and library flows checked at desktop and mobile
  widths; search, focus filters, reset behavior, overflow, and control sizing
  were verified. Account overview, loading, membership-option, and anchored
  panel states were visually reviewed in the browser. Office Hours format,
  unavailable-session, and preparation states were checked before and after
  the redesign with no horizontal overflow. Membership pricing was visually
  reviewed before and after adding the plan finder, with the recommendation
  hierarchy, fallback state, and plan comparison transition confirmed. Shop
  search controls, editorial product covers, price hierarchy, and complete
  desktop page composition were visually checked before and after the catalog
  redesign. The homepage starting-point matrix and compact membership overview
  were reviewed in a signed-in browser state, including their anchored
  transitions into Pricing. Login and failed password-recovery entry states
  were reviewed in the browser, including account-specific intent, error
  hierarchy, recovery-only controls, and the absence of authentication-method
  distractions during recovery. The membership comparison and its shared
  billing-policy panel were reviewed as a complete desktop composition, with
  mobile layout, target size, policy-link uniqueness, and overflow verified by
  the focused browser suite. Support was reviewed as a complete desktop help
  flow from task cards through contact and policy navigation; both narrow
  layouts were verified by the focused browser suite. The article-detail hero,
  public-opening boundary, exact Tier 1 route, guide-details rail, and visible
  reading-time treatment were reviewed in a signed-in preview state; narrow
  layouts and control sizing were verified by the focused Reading suite. Admin
  workspace cards and the default Open checklist were reviewed as full desktop
  compositions, and the Confirm filter was exercised from 19 open items to 9
  operator-confirmation items. The product-detail hero, included-outcome grid,
  delivery sequence, and sticky purchase panel were reviewed together in the
  signed-in demo state, including the truthful unavailable-Checkout treatment.
  The Shop true-empty and connection-paused panels were reviewed as desktop
  compositions; provider-free Library, Shop, and Office Hours recovery states
  were verified at desktop, 390-pixel, and 320-pixel widths for exact actions,
  target size, overflow, and blocking accessibility findings.
  The complete eight-section member guide was reviewed with a temporary local
  Tier 1 Demo state: every outline link matched one visible heading, anchor
  navigation updated the URL, the target stopped 112 pixels below the top edge,
  and the desktop layout retained zero horizontal overflow. The Demo tier was
  restored immediately and was not included in the implementation. The
  related-reading section was then checked in the normal signed-in preview
  state: its three desktop cards were equal-height, every action was at least
  44 pixels high, the page had no horizontal overflow, the public article link
  opened the correct durable URL, and text from related bodies was absent.

## Follow-up Note

Use the single consolidated owner checkpoint in
`docs/phase-4-experience-and-operations-acceptance.md` for production
authentication, billing, email, and hosted-service validation. No additional
login requests are introduced by this review.
