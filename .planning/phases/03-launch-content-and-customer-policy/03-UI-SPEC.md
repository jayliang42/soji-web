---
phase: 3
slug: launch-content-and-customer-policy
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-26
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for launch content, Office Hours, customer
> policies, and the pre-Checkout trust path. Generated and verified inline by
> Codex because this task does not authorize separate subagents.

---

## Experience Thesis

Soji should feel like a calm independent publication whose membership boundary
is trustworthy, not like a SaaS dashboard with articles attached. A visitor
gets enough editorial value to judge the work, understands exactly why the
remaining material is protected, and can inspect price, renewal, cancellation,
refund, and support terms without hunting.

The interaction model borrows three proven conventions without copying another
brand:

1. Ghost/Substack: a useful public opening followed by one natural paywall
   transition inside the article.
2. Patreon: explicit audience/access labels rather than mysterious lock icons.
3. Premium editorial memberships: generous reading measure, quiet metadata,
   owned imagery, low-chrome cards, and one dominant action per section.

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing Tailwind CSS configuration; no shadcn initialization |
| Preset | Not applicable |
| Component library | Existing Soji React components; no third-party UI registry |
| Icon library | None required; use text labels and minimal inline SVG only when meaning remains visible in text |
| Display font | Georgia, Times New Roman, serif |
| Body font | Inter, Helvetica Neue, sans-serif |
| Radius | 4px compact, 6px controls, 8px cards; pills only for short state badges |
| Content width | `max-w-6xl` collections, `max-w-[72ch]` article/policy prose |

No new color, font, component registry, animation library, or design-system
dependency is permitted in this phase.

## Spacing Scale

Declared values are multiples of 4 and align with the existing Soji rhythm.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline icon/text gap, badge internals |
| sm | 8px | Compact metadata, related links |
| md | 12px | Label-to-heading and tight control groups |
| base | 16px | Paragraph gaps and mobile card padding minimum |
| lg | 20px | Notice and form padding |
| xl | 24px | Card padding, collection gaps |
| 2xl | 32px | Desktop card/article inset, section subgroups |
| 3xl | 48px | Major section separation |
| 4xl | 64px | Page-level top/bottom rhythm |
| 5xl | 80px | Desktop collection closing space |

Exceptions: 44px minimum interactive target height for buttons/links is an
accessibility size, not a spacing token. Article measure uses characters, not
pixels.

## Typography

| Role | Size | Weight | Line Height | Contract |
|------|------|--------|-------------|----------|
| Metadata label | 12px | 700 | 1.4 | Uppercase, at most 0.12em tracking, never the only access signal |
| Secondary/support text | 14px | 500–600 | 1.55 | Dates, access explanation, policy revision metadata |
| Body | 16px mobile / 18px article | 400–500 | 1.7–1.8 | No long paragraphs in 14px |
| Card title | 30px mobile / 36px desktop | 600–700 | 1.05 | Display face, two-line target |
| Section heading | 36px mobile / 48px desktop | 700 | 1.02 | Display face |
| Article title | 44px mobile / 64px desktop | 700 | 0.98–1.02 | Max 18 words; balance naturally |
| Display | 48px mobile / 72px desktop | 800–900 | 0.92–1.0 | Reserved for top-level editorial hero only |

Article and policy prose must preserve a readable `65–72ch` measure. Lists use
at least 8px between items. Links in long-form copy are underlined by default,
not identifiable by color alone.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f4f5f2` | Page background and quiet editorial field |
| Primary surface | `#ffffff` | Cards, article sheet, policy sheet, sticky header |
| Secondary surface (30%) | `#eef0ec` | Metadata groups, neutral notices, footer subgroups |
| Foreground | `#201f1c` | Primary text and dominant buttons |
| Muted text | `#655f58` | Supporting copy; never below accessible contrast |
| Border | `#c8ccc5` | Dividers and card boundaries |
| Accent (10%) | `#9b432b` | Eyebrows, text links, focus, preview transition, one emphasized action |
| Accent muted | `#f4e6df` | Preview and purchase disclosure panels |
| Success | `#2f6f3d` | Verified access/full/replay-available state only |
| Success muted | `#eef8ed` | Success state background |
| Warning | `#9a6700` | Coming-soon or action-needed state |
| Destructive | `#b42318` | Invalid launch input and destructive Admin actions only |

Accent is reserved for text links, focus outlines, preview boundary markers,
selected access emphasis, and one primary conversion emphasis per viewport.
It is not used on every button, badge, heading, or decorative element.

Access status always combines copy with color:

| State | Label | Tone |
|-------|-------|------|
| Public full | `Public · Full article` | Neutral/success |
| Visitor preview | `Public preview` | Accent |
| Signed-in lock | `Included with {membership}` | Neutral with specific CTA |
| Entitled full | `Included in your membership` | Success |
| Access verification failure | `Access temporarily unavailable` | Neutral/error notice, no lock implication |

## Page Contracts

### Library Collection

- Lead with `Library` eyebrow, an editorial value headline, and one sentence
  explaining that public guides and member editions live together.
- The source badge is permitted only in explicit demo/development mode. Live
  production must not show a technical `Supabase` label to readers.
- The first flagship item spans two columns on desktop and leads with a
  4:3 owned cover. Remaining items use a consistent 4:3 crop and equal-height
  editorial cards.
- Card order: cover → type/date → title → summary → tags → access label →
  action. Tags are secondary and limited to three visible tokens.
- Replace generic `Read` with `Read article`, `Read preview`, or `View access`
  according to state.
- Mobile is one column with 24px gaps. Tablet is two columns. Desktop uses a
  featured lead plus a two/three-column supporting grid.

### Article Detail

- Use an editorial header separate from the body sheet: type/date, title,
  summary, owned cover, access label, and optional estimated reading time.
- Body uses one `max-w-[72ch]` reading column and 18px/1.8 typography. The
  cover may be wider than the text but remains within `max-w-6xl`.
- A restricted article renders the public opening normally. At the explicit
  preview boundary, use one full-width transition block with a top rule,
  eyebrow, exact membership benefit, one primary action, and one secondary
  action.
- Do not repeat a lock badge, lock icon, upsell card, and modal for the same
  boundary. One transition is enough.
- An entitled reader sees no upgrade block; a small success label near the
  header is sufficient.
- Access verification failure removes restricted body and presents a calm
  retry/support path. It must not say “upgrade” because membership is unknown.

### Office Hours

- Page intro explains format and eligibility without promising individualized
  financial advice.
- Split content into `Upcoming` and `Replay library` sections when both exist.
  Within each, sort nearest/newest first.
- Session card order: status/date → title → short agenda or “bring” prompt →
  access label → primary action → secondary status.
- Upcoming entitled state: primary `Reserve a seat`; optional secondary
  `Add to calendar` only if a real calendar artifact exists.
- Upcoming locked state: `Included with Guided membership` plus `Compare
  membership`; never render or serialize the signup URL.
- Completed entitled state: primary `Watch replay` when ready, otherwise static
  `Replay coming soon`.
- External destinations open in a new tab with `rel="noreferrer noopener"` and
  visible `Opens in a new tab` assistive text.
- Localized date/time includes timezone. Avoid raw ISO strings.

### Support and Policy Pages

- Use one shared `PolicyLayout` with eyebrow, page title, one-sentence summary,
  effective/updated date, table of contents on long pages, and 65–72ch prose.
- `Support` is task-oriented: billing/account, content access, product download,
  and Office Hours sections. Each explains what details to send and what never
  to send (passwords, full card data, tokens).
- Policy page H2 headings are action-oriented and scannable: `Information we
  collect`, `How we use it`, `How cancellation works`, `When we issue refunds`.
- Put the financial-education disclaimer in Terms and link to the dedicated
  page; do not add a legal warning banner to every article.
- Internal “draft/legal review pending” markers belong in Admin/readiness
  evidence, not customer-facing page headings.

### Global Footer

- Desktop: three columns — brand statement, `Explore`, `Support & policies`.
  Mobile: stacked groups with 24px separation.
- `Explore`: Library, Membership, Shop, Office Hours, Account.
- `Support & policies`: Support, Privacy, Terms, Refund policy, Financial
  disclaimer.
- Footer links use 44px minimum touch height on mobile and visible focus/hover.
- Keep legal/support links out of the primary header to preserve the core task.

### Pre-Checkout Trust Path

- Add a compact `PurchaseDisclosure` directly below each membership/product
  action group, not in a distant page footer.
- Membership copy: `{price} billed monthly until canceled. Cancel from Account;
  access continues according to your paid period and billing status.`
- Product copy: `One-time purchase. Delivered to your Soji account. Review the
  digital-product refund policy before paying.`
- Both versions link `Terms`, `Refund policy`, `Privacy`, and `Support` with
  descriptive accessible names.
- The disclosure uses 14px text, 1.55 line height, a top border or muted surface,
  and no pre-checked local consent box. Required consent happens on
  Stripe-hosted Checkout.

### Admin Launch Validation

- Invalid content/Office Hours inputs appear at the field and in one summary.
- Use specific corrections: `Use an HTTPS signup URL on a real service`,
  `Replace example.com before publishing`, `Add owned cover alt text`.
- Distinguish `Ready`, `Needs owner input`, and `Invalid`. “Needs owner input”
  is not a failed technical check and must never be auto-promoted to ready.
- Preserve drafts on validation errors and focus the first invalid field.

## State Matrix

| Surface | Loading | Empty | Error | Ready |
|---------|---------|-------|-------|-------|
| Library | Skeleton for header + 3 cards | `The first guide is being prepared` + Membership link | `The library is temporarily unavailable` + retry | Featured guide + supporting grid |
| Article | Header/body skeleton | Not found route | `This piece could not be loaded` or `Access temporarily unavailable` | Public/preview/locked/full contract |
| Office Hours | Two session skeletons | `No live session is scheduled` + replay/library link | Hide targets; stable retry copy | Upcoming/replay groups |
| Policy | Static, no runtime skeleton | Not applicable | Build-time failure if missing | Versioned readable document |
| Support contact | Static shell | `Support contact is being configured` and Checkout disabled in production | Stable non-sensitive fallback | Exact public channel |

Skeletons match final geometry and honor reduced motion. Empty states always
offer one useful next step. Errors explain whether content or only access
verification is unavailable.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Library primary CTA | `Read the flagship guide` |
| Public article CTA | `Read article` |
| Preview primary CTA | `Compare membership` |
| Preview secondary CTA | `Sign in to check access` |
| Locked CTA | `See the membership that includes this` |
| Entitled label | `Included in your membership` |
| Upcoming Office Hours CTA | `Reserve a seat` |
| Replay CTA | `Watch replay` |
| Missing replay | `Replay coming soon` |
| Library empty heading | `The first guide is being prepared` |
| Library empty body | `Browse membership details now, then return when the first guide is published.` |
| Access error | `We could not verify access right now. No member-only content or private links have been shown. Try again or contact Support.` |
| Support primary CTA | `Contact Soji support` |
| Product disclosure | `One-time purchase. Delivered to your Soji account.` |
| Subscription disclosure | `Billed monthly until canceled. Cancel from Account.` |
| Destructive confirmation | `Unpublish this guide? Readers will lose access to its public page until it is published again.` |

Copy rules:

- Prefer `membership`, `guide`, `article`, `session`, and `replay` over storage
  or billing vocabulary.
- Never show raw entitlement keys, visibility enums, provider IDs, or data
  source names on production customer pages.
- Never claim `secure`, `private`, `guaranteed`, `advice`, or `instant` unless
  the exact behavior is implemented and verified.
- Customer policy copy uses plain language first, defined terms only when
  required, and no all-caps legal blocks.

## Responsive and Accessibility Contract

- Validate at 320, 375, 768, 1024, and 1440 CSS pixels.
- No horizontal overflow at 320px. Long URLs never appear as visible raw text.
- All interactive elements are keyboard reachable with the existing 3px clay
  focus outline and at least 44px touch height.
- Heading levels stay sequential. Each card list is a semantic section/list;
  article prose is inside one `<article>`.
- Covers use meaningful alt text when editorial; decorative textures use empty
  alt. Never repeat the adjacent title as the only alt description.
- Access state, validation, and replay availability are never color-only.
- External new-tab behavior is announced accessibly.
- All policy content remains usable at 200% zoom and reflows without two-column
  prose.
- Motion is unnecessary for this phase; honor the existing reduced-motion rule.

## Acceptance Views

Capture and compare the following without storing personal or provider data:

1. 1440px guest Library with featured real guide.
2. 375px guest preview at the in-article boundary.
3. 375px signed-in locked article with tier-specific action.
4. 1440px entitled full article without upsell.
5. 375px Office Hours locked state with no target in HTML.
6. 1440px entitled upcoming and replay states.
7. 375px footer and each policy page at 200% zoom.
8. 1440px Pricing and Shop pre-Checkout disclosures.
9. Keyboard/focus sequence through header, primary action, preview boundary,
   footer policies, and support.
10. Access/data failure states for Library and Office Hours.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None | Not required |
| Third-party registries | None | No third-party block is permitted |

No registry code, copied competitor markup, external UI script, remote font, or
tracking snippet may be introduced for this phase.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — actions, empty/error states, recurring disclosure, and policy labels are exact.
- [x] Dimension 2 Visuals: PASS — each surface has a concrete hierarchy, state matrix, responsive layout, and acceptance views.
- [x] Dimension 3 Color: PASS — existing semantic palette is preserved with explicit accent and state restrictions.
- [x] Dimension 4 Typography: PASS — roles, measures, weights, responsive sizes, and link treatment are specified.
- [x] Dimension 5 Spacing: PASS — one 4px-based scale covers collection, article, policy, and mobile layouts.
- [x] Dimension 6 Registry Safety: PASS — no registry or third-party UI code is used.

**Approval:** approved 2026-07-26
