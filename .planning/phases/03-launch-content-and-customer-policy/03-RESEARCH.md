---
phase: 3
slug: launch-content-and-customer-policy
status: complete
created: 2026-07-26
requirements:
  - CONT-01
  - OPS-01
  - OPS-03
---

# Phase 3 — Implementation Research

## Research Question

What must be known to plan a truthful launch-content, Office Hours, and
customer-policy phase on the existing Soji architecture?

## Executive Recommendation

Build Phase 3 as four bounded slices:

1. Extend the content contract with explicit public preview copy, owned-cover
   metadata, and tags; publish one flagship guide and render the complete
   Library/article state matrix without sending restricted body text.
2. Centralize safe launch-value validation and project Office Hours into
   authorized presentation objects so private targets are absent from
   unauthorized markup.
3. Create static policy/support pages and shared pre-Checkout disclosures;
   require Stripe Terms acceptance and fail Checkout/readiness until the owner
   has configured the public support channel and policy approval flags.
4. Add deterministic evidence and browser acceptance, while keeping the
   owner-supplied provider URLs and legal approval truthfully pending.

This work fits the current modular monolith. It does not need a CMS, rich-text
framework, legal-content dependency, third-party component library, or new
service.

## Current-State Findings

### Content

- `ContentItem` has `body`, `summary`, `coverImage`, and `tags`, but Supabase
  persists no tags, cover alt text, or explicit preview body.
- `getVisibleContentBody()` currently returns only `summary` for preview and
  unavailable states. It is safe but too thin to establish editorial value.
- `getContentBySlug()` remains server-only and the detail page renders safe
  Markdown. This is a suitable boundary: select either preview or complete body
  before passing text to `MarkdownContent`.
- `ContentSourceBadge` already hides the implementation source in live mode and
  shows only a reader-safe demo label.
- Cover images are uploaded with signature/type/size validation, but the
  content Admin contract accepts generic absolute URLs and does not collect alt
  text.
- Current seed content is intentionally shallow and uses hotlinked Unsplash
  URLs. It cannot satisfy the “real content + real cover” requirement without
  replacement.

### Office Hours

- `getOfficeHourSnapshot()` runs on the server, loads live Supabase data when
  configured, and never falls back to demo rows in live mode.
- The page conditionally renders signup/replay anchors after entitlement
  evaluation. Existing failure tests prove targets are absent from rendered
  HTML when session verification fails.
- The Admin route accepts `http:` as well as `https:`, does not reject
  `example.com`, loopback, embedded credentials, or other placeholder hosts,
  and treats a replay as an optional field without lifecycle presentation.
- Database rows are not public-readable; service/Admin access is already the
  authoritative source. No new registration table is necessary to satisfy this
  phase because the requirement is to use real destinations, not to own booking.

### Policies and Checkout

- No Support, Privacy, Terms, Refund, or financial-disclaimer routes exist.
- The footer has only product navigation and cannot satisfy a customer trust
  path.
- Pricing mentions cancellation but omits an adjacent renewal/refund/support
  disclosure. Products omit adjacent refund/support links.
- Stripe Checkout Sessions support
  `consent_collection.terms_of_service: "required"` when a valid Terms URL is
  configured in Stripe Dashboard. The API also returns the collected consent
  result on the Session object.
- Both Checkout routes already create Sessions server-side, so the Terms
  requirement belongs in the shared Session creation contract, not a client
  checkbox.
- Stripe fulfillment continues to rely on webhooks; policy/consent changes do
  not change the Phase 2 payment authority.

### Readiness

- `/api/health/ready` merges named configuration and operational checks and
  returns `503` when any check is false.
- `getOperationalReadiness()` and the Admin Launch Checklist are the correct
  integration points for real content, safe Office Hours destinations, support
  contact, and policy-approval signals.
- Current Admin launch status hardcodes Office Hours as manual. Phase 3 should
  replace that with computed `ready | needs owner input | invalid` evidence,
  while never returning the actual protected target.

## Recommended Data Contract

Add a forward-only migration and schema parity for these content columns:

| Column | Type | Purpose |
|--------|------|---------|
| `preview_markdown` | `text not null default ''` | Explicit useful preview; selected before Markdown rendering |
| `cover_image_alt` | `text not null default ''` | Stable owned-cover description |
| `tags` | `text[] not null default '{}'` | Live editorial metadata instead of demo-only tags |

Update `upsert_content_item` atomically with the new arguments and preserve
revision checks. Publication validation should enforce:

- public content: complete body required; preview may be empty;
- restricted published content: non-empty preview, at least one required
  entitlement unless `members_only` intentionally means any authenticated
  member;
- all published launch candidates: cover URL, cover alt text, summary, and body;
- the flagship guide: owned `/covers/...` path or validated `content-media`
  public URL, at least three tags, explicit preview, and complete body.

Do not encode the preview boundary as raw HTML inside Markdown. A first-class
field is easier to validate, safer to render, and clearer in Admin.

## Safe Launch-Value Validation

Create one server-safe library used by Admin routes, readiness, and evidence:

```text
validatePublicSupportContact(value)
validateOwnedContentCover(value, canonicalOrigin)
validateOfficeHourDestination(value)
evaluateContentLaunchReadiness(items)
evaluateOfficeHoursLaunchReadiness(items, now)
```

External destination rules:

- `https:` only;
- no username/password;
- no loopback, `.local`, private-IP literal, or empty host;
- reject `example.com`, `example.org`, `example.net`, and subdomains;
- normalize/trust only parsed `URL` values;
- do not echo the URL in customer or readiness error payloads.

Owned covers may use a root-relative `/covers/...` public path or the canonical
Supabase public Storage origin. Arbitrary remote hotlinks should remain
available for drafts only and fail launch readiness.

Public support configuration should use one explicit public value such as
`NEXT_PUBLIC_SUPPORT_URL` (an HTTPS form/helpdesk or `mailto:` address through a
separate typed contact parser). Prefer an HTTPS support page/portal or durable
role address over a personal inbox. Missing configuration keeps Checkout and
production readiness closed.

## Office Hours Projection

Preserve the raw `OfficeHourSession` as a server/domain type. Add a
presentation builder that returns only:

```text
id, title, startsAt, lifecycle, accessLabel, primaryAction
```

`primaryAction.href` exists only when:

- access verification succeeded;
- the member has every required entitlement;
- the session lifecycle selects signup or replay;
- the selected target passes launch URL validation.

Lifecycle should be deterministic from an injected `now`:

- `upcoming`: starts in the future → signup when entitled;
- `replay_pending`: started/passed and no valid replay;
- `replay_ready`: passed and valid replay;
- `unavailable`: data or access verification failed.

Tests can now assert absence of `href` on the presentation object in addition
to absence from HTML.

## Policy Architecture

Use source-controlled TypeScript/Markdown-like page copy rather than adding a
CMS dependency. Create a shared `PolicyLayout` and explicit route modules so
metadata, sitemap, headings, internal links, and updated dates are testable at
build time.

Recommended public configuration:

| Variable | Meaning | Production behavior when absent |
|----------|---------|---------------------------------|
| `NEXT_PUBLIC_SUPPORT_URL` | Durable support contact/portal | Support CTA unavailable; Checkout/readiness closed |
| `SOJI_POLICIES_APPROVED` | Owner/legal review completed for current revision | Checkout/readiness closed |
| `STRIPE_TERMS_ACCEPTANCE_READY` | Stripe Dashboard has canonical Terms URL | Checkout/readiness closed |

The long policy pages can ship as review-ready drafts without showing a
customer-facing “draft” banner, but the production gate must remain false until
the owner confirms them. Avoid invented business address, legal entity,
governing law, arbitration, response-time promise, or jurisdiction.

### Current Legal/Platform Caveat

- The FTC's 2024 amended Negative Option/“Click to Cancel” rule was vacated by
  the Eighth Circuit in 2025. In March 2026 the FTC opened a new rulemaking
  inquiry. Do not describe the 2024 rule as the current universal federal rule.
- Existing FTC Act/ROSCA enforcement and current FTC subscription cases still
  emphasize truthful material terms, informed consent, and a simple
  cancellation path. State laws may add requirements.
- Therefore Soji should implement these as customer-trust and conservative
  compliance baselines, but final copy and launch approval remain
  jurisdiction-specific owner/legal decisions.
- Stripe lists financial products/services as restricted, while individual
  creators selling their own content generally do not require content-platform
  preapproval. Soji copy must consistently describe educational publishing and
  avoid individualized regulated-services claims; Stripe account eligibility
  remains Stripe's decision.

## UI/UX Research Translation

| Peer pattern | Use in Soji | Avoid |
|--------------|-------------|-------|
| Ghost public preview divider | Useful preview body, then one server-owned CTA boundary | Sending full body and blurring |
| Substack paid-post web CTA | Concise audience explanation and one dominant upgrade action | Generic subscribe language that hides tier/access detail |
| Patreon audience labels | Name exactly who can access an item/session | Feed-heavy chrome or multiple competing badges |
| Independent premium publications | Owned cover, wide editorial header, 65–72ch body, quiet metadata | SaaS dashboard cards and technical source labels |

The existing Soji palette and Georgia/Inter typography already support this
direction. No design-system replacement is warranted.

## Testing Strategy

### Unit/Component

- content publication validation for public/restricted states;
- access mode returns exact preview/full/locked/unavailable body;
- Office Hours URL validator and lifecycle projection;
- support/policy configuration validators;
- `ContentCard`, preview CTA, policy disclosure, and footer markup;
- Checkout Session payload requires Terms acceptance;
- readiness and Admin checklist named states.

### Route/Database

- Admin content/Office Hours routes reject placeholder or unsafe launch values
  with stable reasons and preserve drafts/revision behavior;
- migration/RPC round trips persist preview, cover alt, and tags;
- grants/RLS remain unchanged or stricter;
- health readiness returns only booleans and never destinations/support
  secrets (the support value is public, but need not be echoed).

### Browser

- 320/375/768/1024/1440 no-overflow and accessibility;
- guest preview, signed-in lock, entitled full article;
- unauthorized Office Hours HTML contains neither signup nor replay URL;
- footer and purchase disclosures link all policies;
- policy headings and 200% zoom reflow;
- keyboard/focus path and external-link announcement.

### Production Evidence

Keep owner/legal/provider scenarios `PENDING` until canonical observation.
Repository tests may prove the code and leak boundaries but may not promote:

- durable support channel responds;
- real signup/replay target works;
- Stripe Dashboard Terms URL is configured;
- owner/legal approval is complete;
- canonical production users see expected states.

## Validation Architecture

| Layer | Fast sample | Full gate |
|-------|-------------|-----------|
| Types/domain | `corepack pnpm --filter @soji/web test -- --runInBand` is not supported; use targeted Vitest files | Workspace typecheck + Web full tests |
| Web targeted | `corepack pnpm --filter @soji/web test -- tests/content-access.test.ts tests/launch-inputs.test.ts` | `corepack pnpm --filter @soji/web test` |
| Database targeted | local Supabase reset plus focused pgTAP file | schema reapply, DB full pgTAP, generated type parity |
| UI/browser | targeted Playwright public/access specs | full desktop/mobile accessibility and public-pages specs |
| Release | source assertions for sitemap/readiness/Checkout consent | lint, typecheck, build, artifact/readiness gates |

Target fast feedback is under 45 seconds for pure Web tasks and under 120
seconds for schema tasks. No task may rely only on a screenshot or manual
inspection.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Full restricted body leaks through RSC/metadata | Select preview before render; static markup/HTML assertions for forbidden sentinel |
| Real provider target appears to unauthorized user | Project authorized action server-side; assert raw URL absent from HTML |
| Placeholder value passes production | One validator reused across write/readiness/evidence |
| Policy contradicts billing state | Reuse Phase 2 cancellation/refund/dispute decisions in copy tests |
| “Legal complete” is inferred from page existence | Explicit `SOJI_POLICIES_APPROVED` gate and pending evidence |
| Stripe Checkout breaks before Dashboard URL exists | Separate readiness flag, stable Checkout unavailable state, canonical owner checklist |
| Schema update drifts from generated types | Migration + `schema.sql` + local reapply + type generation parity in one plan |
| Existing dirty worktree is bundled | Plans enumerate exact files and commits; never stage unrelated mobile/docs changes |

## Authoritative Sources

- Ghost public previews: https://ghost.org/help/public-previews/
- Ghost member access contract: https://docs.ghost.org/themes/members
- Substack paid post previews: https://support.substack.com/hc/en-us/articles/4407989020308-How-do-I-publish-a-free-preview-of-a-paid-post-on-Substack
- Patreon audience access: https://support.patreon.com/hc/en-us/articles/37807653033997-Setting-post-access-for-your-Patreon-audience
- Stripe Checkout Session Terms consent: https://docs.stripe.com/api/checkout/sessions/create
- Stripe restricted-business guidance: https://stripe.com/legal/restricted-businesses
- FTC 2026 negative-option rulemaking status: https://www.ftc.gov/business-guidance/blog/2026/03/do-you-have-thoughts-negative-option-related-regulations-share-them-ftc
- FTC 2026 subscription enforcement: https://www.ftc.gov/news-events/news/press-releases/2026/05/shutterstock-pay-35-million-settle-ftc-allegations-over-illegal-subscription-cancellation-practices

## Planning Implications

- Phase 3 requires a Supabase migration and therefore a blocking local schema
  apply/reapply before verification. Production push stays in the consolidated
  authorized provider checkpoint.
- Keep flagship editorial asset generation independent from legal/provider
  configuration so it can complete autonomously.
- Split customer policy/Checkout work from content/Office Hours access work;
  join them in one final evidence/readiness plan.
- All 26 context decisions must appear in plan `must_haves.truths` references
  so the decision coverage gate can prove translation.

## RESEARCH COMPLETE
