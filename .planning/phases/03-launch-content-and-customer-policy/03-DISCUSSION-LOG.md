# Phase 3: Launch Content and Customer Policy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 3-Launch Content and Customer Policy
**Areas discussed:** Launch content and reader access, Office-hours destinations and eligibility, Support and policy trust path, Production truth and acceptance evidence
**Mode:** `--auto --chain`; all recommended defaults selected without interrupting the owner

---

## Launch Content and Reader Access

| Option | Description | Selected |
|--------|-------------|----------|
| One flagship guide plus supporting previews | Publish a substantive real guide and keep shorter fixtures clearly secondary | ✓ |
| Treat all current demo fixtures as launch content | Promote the existing thin fixtures without editorial hardening | |
| Block until owner copy arrives | Pause all work pending finished copy | |

**Selection:** One flagship guide plus supporting previews.
**Auto note:** `[auto] Launch content and reader access — Q: "What should count as the first real launch publication?" → Selected: "One flagship guide plus supporting previews" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Useful preview with natural boundary and specific CTA | Server-render a useful opening and remove restricted body before response | ✓ |
| Metadata-only locked pages | Reveal no content before purchase | |
| Client-side blur of the complete article | Send the complete body and visually obscure it | |

**Selection:** Useful preview with natural boundary and specific CTA.
**Auto note:** `[auto] Launch content and reader access — Q: "How should public, preview, and locked states differ?" → Selected: "Useful preview with natural boundary and specific CTA" (recommended default)`

---

## Office-Hours Destinations and Eligibility

| Option | Description | Selected |
|--------|-------------|----------|
| Server-gated separate actions with URL validation | Verify entitlement before returning signup/replay targets | ✓ |
| Render links and hide them with CSS | Treat presentation as authorization | |
| One generic external community link | Collapse booking and replay into one destination | |

**Selection:** Server-gated separate actions with URL validation.
**Auto note:** `[auto] Office-hours destinations and eligibility — Q: "How should signup and replay destinations be exposed?" → Selected: "Server-gated separate actions with URL validation" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Lifecycle-aware upcoming and replay states | Change actions and copy based on session timing and replay availability | ✓ |
| Show both buttons at all times | Ignore lifecycle truth | |
| Hide completed sessions entirely | Remove useful replay history | |

**Selection:** Lifecycle-aware upcoming and replay states.
**Auto note:** `[auto] Office-hours destinations and eligibility — Q: "What should the page show before and after a session?" → Selected: "Lifecycle-aware upcoming and replay states" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Build everything and carry only exact URLs | Finish automation without fabricating a provider | ✓ |
| Insert plausible public placeholders | Make the UI appear complete with unverified targets | |
| Stop all Phase 3 work | Block unrelated implementation | |

**Selection:** Build everything and carry only exact URLs.
**Auto note:** `[auto] Office-hours destinations and eligibility — Q: "How should unknown real provider URLs be handled during autonomous work?" → Selected: "Build everything and carry only exact URLs" (recommended default)`

---

## Support and Policy Trust Path

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated pages plus footer and pre-Checkout links | Make policy/support discoverable globally and at the purchase decision | ✓ |
| Footer links only | Keep purchase surfaces visually simpler but less explicit | |
| One combined legal page | Reduce routes at the cost of scanning and stable references | |

**Selection:** Dedicated pages plus footer and pre-Checkout links.
**Auto note:** `[auto] Support and policy trust path — Q: "Where should customers encounter support and policies?" → Selected: "Dedicated pages plus footer and pre-Checkout links" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Plain-language summary plus required hosted consent | Disclose recurring terms before redirect and collect Stripe-hosted acceptance | ✓ |
| Rely on a footer Terms link | Make the long document discoverable but keep key terms implicit | |
| Put all terms only inside the long policy | Avoid concise purchase-specific disclosures | |

**Selection:** Plain-language summary plus required hosted consent.
**Auto note:** `[auto] Support and policy trust path — Q: "What subscription terms must be conspicuous before payment?" → Selected: "Plain-language summary plus required hosted consent" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Product-truthful review draft | Implement accurate drafts while preserving an explicit owner/legal gate | ✓ |
| Present generic boilerplate as final | Publish borrowed promises without business validation | |
| Defer every policy page | Leave the customer trust path absent | |

**Selection:** Product-truthful review draft.
**Auto note:** `[auto] Support and policy trust path — Q: "How final should the legal copy be?" → Selected: "Product-truthful review draft" (recommended default)`

---

## Production Truth and Acceptance Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Central validator and fail-closed readiness | Reject placeholder launch values consistently across writes and release gates | ✓ |
| Document manual checks only | Depend on operator memory | |
| Remove demo mode completely | Lose deterministic local preview and tests | |

**Selection:** Central validator and fail-closed readiness.
**Auto note:** `[auto] Production truth and acceptance evidence — Q: "How should demo values be prevented from reaching production?" → Selected: "Central validator and fail-closed readiness" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Layered automated evidence plus truthful production pending rows | Prove code boundaries without inventing canonical observations | ✓ |
| Screenshots alone | Show presentation without security or response proof | |
| Unit tests only | Miss integrated routes, HTML, and responsive behavior | |

**Selection:** Layered automated evidence plus truthful production pending rows.
**Auto note:** `[auto] Production truth and acceptance evidence — Q: "What evidence should count for Phase 3?" → Selected: "Layered automated evidence plus truthful production pending rows" (recommended default)`

| Option | Description | Selected |
|--------|-------------|----------|
| Borrow interaction patterns, keep Soji identity | Use proven preview/access conventions inside the existing visual system | ✓ |
| Clone a single competitor | Copy another product's visual and business assumptions | |
| Avoid all external conventions | Ignore familiar customer expectations | |

**Selection:** Borrow interaction patterns, keep Soji identity.
**Auto note:** `[auto] Production truth and acceptance evidence — Q: "How should UI peer research influence Soji?" → Selected: "Borrow interaction patterns, keep Soji identity" (recommended default)`

## the agent's Discretion

- Flagship guide structure, title, cover treatment, and preview representation.
- Shared policy components, launch validator shape, and evidence schema.
- Responsive spacing, typography, card hierarchy, labels, and state microcopy.

## Deferred Ideas

- Exact support, booking, and replay destinations; Stripe Dashboard policy URLs; and owner/legal approval remain one consolidated owner checkpoint.
- Search, recommendations, comments, newsletters, community, analytics, live streaming, and mobile purchasing stay outside Phase 3.
