# Phase 3: Launch Content and Customer Policy - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning
**Mode:** Autonomous recommendations accepted under the owner's instruction for Codex to finish automatable work and expose one consolidated human checkpoint

<domain>
## Phase Boundary

This phase turns Soji's existing content, Office Hours, and purchase surfaces
into a truthful launch experience. It publishes one substantive flagship
money-decision guide with an owned cover, proves public/preview/locked/full
reader states, makes Office Hours lifecycle and access states explicit, and
publishes customer-facing Support, Privacy, Terms, Refund, and
financial-education disclaimer pages with links before Checkout.

The phase may add data validation, first-party assets, policy configuration,
readiness signals, content presentation, server-side access boundaries, and
secret-safe acceptance evidence needed to make those outcomes reliable. It does
not invent the owner's support address, booking/replay destinations, legal
entity details, or legal approval. It also does not add newsletters, comments,
community, recommendations, live streaming, or accept live payments.

</domain>

<decisions>
## Implementation Decisions

### Launch Content and Reader Access
- **D-01:** Publish one substantive flagship money-decision guide as the Phase 3 launch proof. Existing shorter demo items remain supporting previews until they receive the same editorial review; they must not be presented as a deep finished archive.
- **D-02:** The flagship cover must be an owned Soji asset served from the application or the existing `content-media` workflow. Production launch content must not hotlink a stock-image query URL.
- **D-03:** Every published item must have a stable title, summary, type, semantic publish date, useful tags, cover alt text, preview copy, and explicit access requirement.
- **D-04:** Public content renders in full. Restricted content gives visitors a useful introduction before a natural preview boundary; authenticated users without the entitlement see a tier-specific lock; entitled members see the complete body.
- **D-05:** Restricted body text must be removed before rendering and must never reach anonymous HTML, React payloads, metadata, or client-side state. CSS blur or client-only hiding is not an access boundary.
- **D-06:** Access CTAs name the next useful action: sign in when an existing account may unlock access, compare membership when an upgrade is required, and continue reading when access is available.
- **D-07:** Library cards should lead with cover, editorial type, title, summary, date, and one human-readable access label. Storage enums, entitlement keys, source diagnostics, and generic “Read” actions must not dominate the reader hierarchy.

### Office-Hours Destinations and Eligibility
- **D-08:** Signup and replay URLs are protected operational data. The server may return them only after it has verified the current session and required entitlement; hiding links with CSS is insufficient.
- **D-09:** Upcoming sessions prioritize topic, localizable date/time, what members can bring, eligibility, and a “Reserve a seat” action. Completed sessions replace reservation with replay state; a missing replay is an honest “Replay coming soon” state.
- **D-10:** Signup and replay remain separate actions with safe external-link behavior. Placeholder domains, local URLs, embedded credentials, unsupported protocols, and malformed destinations are rejected at Admin write and production-readiness boundaries.
- **D-11:** Provider or session failures fail closed and do not expose destinations. They use a stable availability message without implying that the member lost access.
- **D-12:** Codex must not fabricate Calendly, Zoom, Meet, or replay URLs. Complete the lifecycle UI, validation, configuration path, and automated evidence now; carry only the exact owner-supplied destinations into the single final checkpoint.

### Support and Customer Policy Trust Path
- **D-13:** Publish dedicated `/support`, `/privacy`, `/terms`, `/refund-policy`, and `/financial-disclaimer` pages. Use a legal/support footer group that remains readable on mobile instead of mixing the links into primary navigation.
- **D-14:** Repeat concise support and policy links beside membership and product purchase actions so price, cadence, renewal, cancellation, refund treatment, and help are discoverable before redirecting to Stripe.
- **D-15:** Membership purchase copy must state that billing recurs monthly until canceled, cancellation is available through Account/Stripe Customer Portal, and cancellation stops future renewal while access follows the paid-period and billing-state rules.
- **D-16:** Stripe-hosted Checkout must request Terms acceptance after the canonical Terms URL is configured in Stripe. The local purchase surface still provides the short plain-language summary; a checkbox is not a substitute for conspicuous terms.
- **D-17:** The refund draft uses one truthful baseline: membership charges are generally non-refundable after billing, with duplicate charges, technical failure, applicable-law rights, and promptly reported first-charge mistakes reviewed through Support; digital products are final after access/download except duplicate, inaccessible, materially defective, or legally required refunds.
- **D-18:** A full refund revokes the associated access, a partial refund does not independently restore or revoke it, and dispute behavior remains the Phase 2 policy. Policy copy must not contradict the database state machine.
- **D-19:** Privacy copy describes only the current system: account/profile data in Supabase, payment and billing identifiers through Stripe, essential session/security storage, support communications, operational logs, and no current sale of personal information or unimplemented marketing analytics.
- **D-20:** Terms and content pages identify Soji as educational publishing, not individualized investment, legal, tax, or accounting advice; they avoid performance guarantees and “get rich” claims.
- **D-21:** These are implementation-complete, US-oriented review drafts, not legal advice or a substitute for jurisdiction-specific review. Do not invent a legal entity name, postal address, jurisdiction, or support contact.

### Production Truth and Acceptance Evidence
- **D-22:** Centralize launch-input validation and reuse it in Admin writes, production readiness, and evidence tooling. Example domains, placeholder contacts, missing covers, unpublished flagship content, or unsafe URLs must fail closed.
- **D-23:** Demo fixtures remain available only when explicit demo mode is enabled. A configured live source is authoritative; missing or invalid live launch data never falls back to demo values.
- **D-24:** Automated evidence covers visitor, signed-in/no-entitlement, entitled member, provider failure, public full article, restricted preview, true lock, upcoming Office Hour, completed/replay state, missing replay, and policy presence before both subscription and product Checkout.
- **D-25:** Browser and route tests must prove that protected content and Office Hours targets are absent from unauthorized responses, not merely invisible on screen.
- **D-26:** Production observations record canonical origin, UTC date, redacted scenario, expected state, observed state, and result. Automated proof cannot promote owner-provided destination, support-contact, legal-approval, or canonical provider rows to `PASS`.

### the agent's Discretion
- Codex may choose the flagship guide's exact structure, title, illustration treatment, preview boundary representation, and responsive editorial composition within Soji's established design system.
- Codex may choose policy-page shared components, configuration shape, database constraints, Admin validation presentation, and the exact evidence schema.
- Codex may refine labels, spacing, typography, card density, empty/loading/error states, and mobile composition while preserving the security and truthfulness decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope and Phase Contract
- `.planning/PROJECT.md` — core value, launch constraints, validated baseline, and active production work.
- `.planning/REQUIREMENTS.md` — Phase 3 requirements `CONT-01`, `OPS-01`, and `OPS-03`.
- `.planning/ROADMAP.md` — Phase 3 boundary, success criteria, dependencies, and UI hint.
- `.planning/STATE.md` — accumulated access/billing decisions, external provider gaps, and single-checkpoint owner instruction.

### Product, UI, and Launch Contracts
- `docs/soji-product-design.md` §§8, 12, 14 — Library intent, preview-value risks, and minimum product acceptance.
- `docs/soji-ui-style-guide.md` §§8–11, 14 — editorial page hierarchy, access states, accessibility, responsive behavior, and UI review checklist.
- `docs/launch-checklist.md` §§9–10, 15–16 — unresolved real Office Hours, launch content/cover, public policy, and minimum launch gates.
- `docs/soji-system-design.md` — entitlement, content, and operational architecture boundaries.

### Existing Content and Access Implementation
- `packages/types/src/index.ts` — shared content, Office Hours, visibility, and entitlement contracts.
- `packages/domain/src/plans.ts` — explicit demo content and Office Hours fixtures that must remain demo-only.
- `apps/web/src/lib/content.ts` — live/demo content data-source boundary.
- `apps/web/src/lib/content-access.ts` — server-side reader access and preview-body boundary.
- `apps/web/src/app/library/page.tsx` — Library collection surface.
- `apps/web/src/app/library/[slug]/page.tsx` — content metadata, access state, and reader surface.
- `apps/web/src/components/content-card.tsx` — reusable Library card.
- `apps/web/src/components/content-preview-cta.tsx` — current preview/lock conversion block.
- `apps/web/src/components/markdown-content.tsx` — safe editorial Markdown renderer.

### Existing Office Hours, Checkout, and Data Operations
- `apps/web/src/lib/office-hours.ts` — live/demo Office Hours source and current server fetch.
- `apps/web/src/app/office-hours/page.tsx` — current eligibility and signup/replay rendering.
- `apps/web/src/components/admin-office-hours-editor.tsx` — Office Hours data-entry surface.
- `apps/web/src/components/admin-content-form.tsx` — content publication and cover-entry surface.
- `apps/web/src/app/api/admin/office-hours/route.ts` — Office Hours write boundary.
- `apps/web/src/app/api/admin/content/route.ts` — content write boundary.
- `apps/web/src/app/api/checkout/subscription/route.ts` — Stripe membership Checkout construction.
- `apps/web/src/app/api/checkout/product/route.ts` — Stripe product Checkout construction.
- `supabase/schema.sql` — authoritative tables, RPCs, RLS, grants, and readiness contract.
- `supabase/seed.sql` — current placeholder launch data that production tooling must not treat as ready.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getContentSnapshot`, `getContentBySlug`, `getContentAccessMode`, and `getVisibleContentBody` already separate live data, access state, and visible body.
- `ContentCard`, `ContentPreviewCta`, `MarkdownContent`, `SectionShell`, and data-state components provide the existing editorial primitives.
- `getSessionSnapshot` and `hasEntitlement` provide the authoritative user/access input shared by Library and Office Hours.
- `getOfficeHourSnapshot` already loads live sessions server-side and fails closed when the live source is unavailable.
- `AdminContentForm` and `AdminOfficeHoursEditor` already own revision-safe editorial operations and are the correct place for actionable launch-input validation.
- Both Checkout routes already own server-side Stripe Session creation, return URLs, and trusted catalog selection.

### Established Patterns
- Live Supabase data is authoritative and never silently replaced by demo data.
- Restricted access is resolved server-side; provider/session failures show stable states and expose no private body or link.
- Reader pages use calm editorial language, while Admin surfaces use explicit operational feedback.
- Schema changes are forward-only migrations kept in parity with `supabase/schema.sql` and generated TypeScript types.
- Production readiness exposes named booleans without returning secrets or catalog rows.
- Automated fixtures and repository tests prove contracts but cannot stand in for canonical provider observations.

### Integration Points
- Extend the Library collection/detail surfaces and content contract for cover alt text and an explicit preview boundary without weakening Markdown sanitization.
- Add a server-only Office Hours presentation projection so unauthorized page responses never receive signup or replay URLs.
- Add shared launch-input validation to Admin routes/forms, readiness, seed/import tooling, and tests.
- Add policy/support route metadata, sitemap entries, global footer grouping, and compact pre-Checkout disclosure components on Pricing and Products.
- Extend both Stripe Checkout Session builders with Terms consent once production configuration is valid.
- Add Phase 3 evidence/runbook coverage alongside the existing launch checklist and fail-closed deployment gates.

</code_context>

<specifics>
## Specific Ideas

- Use Ghost's public-preview divider pattern as the strongest content model: give readers a meaningful beginning, then place one clear membership transition at a natural editorial boundary.
- Use Substack's web paywall pattern for concise “paid subscribers” explanation and one prominent upgrade action, but provide more specific entitlement/tier context than a generic subscribe prompt.
- Use Patreon's explicit audience labeling as evidence that access state should name the eligible audience, without copying its feed-heavy visual language.
- Keep the overall visual direction closer to a premium independent publication: generous reading measure, prominent owned cover, low-chrome cards, quiet metadata, one dominant action, and policy language that is easy to scan.
- Current research references:
  - https://ghost.org/help/public-previews/
  - https://docs.ghost.org/themes/members
  - https://support.substack.com/hc/en-us/articles/4407989020308-How-do-I-publish-a-free-preview-of-a-paid-post-on-Substack
  - https://support.patreon.com/hc/en-us/articles/37807653033997-Setting-post-access-for-your-Patreon-audience
  - https://docs.stripe.com/api/checkout/sessions/create
  - https://www.ftc.gov/business-guidance/blog/2024/10/click-cancel-ftcs-amended-negative-option-rule-what-it-means-your-business
- Stripe currently supports required Terms acceptance on Checkout Sessions when a valid Terms URL is configured. FTC guidance reinforces conspicuous recurring terms, informed consent, and simple cancellation; implementation must remain subject to owner/legal review and current law at launch.

</specifics>

<deferred>
## Deferred Ideas

- Owner-supplied support contact, booking destination, replay destination, Stripe Dashboard policy URLs, and business-owner/legal approval stay in the single consolidated human checkpoint.
- Search, recommendations, comments, newsletter delivery, community, analytics, and live-stream hosting remain v2/growth scope.
- Mobile content parity and RevenueCat remain v2.

</deferred>

---

*Phase: 03-launch-content-and-customer-policy*
*Context gathered: 2026-07-26*
