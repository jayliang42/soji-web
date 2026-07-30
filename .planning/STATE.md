---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-07-30T19:00:39Z"
last_activity: 2026-07-30
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 25
  completed_plans: 20
  percent: 60
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-21)

**Core value:** A verified payment must produce a durable, queryable receipt and the correct customer access state, while unpaid or unauthorized users never receive protected content.
**Current focus:** Phase 05 — production-deployment-and-rollback

## Current Position

Phase: 05 (production-deployment-and-rollback) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-07-30

Progress: [████████░░] 81%

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: 24min
- Total execution time: 1h 11min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 | 3 | 1h 11min | 24min |
| Phase 02 P01 | 33min | 3 tasks | 4 files |
| Phase 02 P02 | 15min | 3 tasks | 5 files |
| Phase 02 P03 | 58min | 2 tasks | 6 files |
| Phase 02 P04 | 27min | 2 tasks | 6 files |
| Phase 02 P05 | 28min | 2 tasks | 5 files |
| Phase 03 P01 | 7min | 3 tasks | 14 files |
| Phase 03 P03 | 7min | 2 tasks | 10 files |
| Phase 03 P04 | 9min | 3 tasks | 21 files |
| Phase 03 P02 | 24 min | 2 tasks | 17 files |
| Phase 03 P05 | 15 min | 3 tasks | 16 files |

## Accumulated Context

| Phase 01 P01 | 7min | 3 tasks | 13 files |
| Phase 01 P02 | 4min | 2 tasks | 6 files |
| Phase 01 P03 | 1h | 3 automatable slices | 4 files |

### Decisions

- Web launches before live Expo/RevenueCat integration.
- Admin remains part of the Web app and shares Supabase identity.
- Billing receipt evidence remains durable and separate from processing outcome.
- Current implementation already includes broad billing, security, Admin, deployment, and UI foundations; this milestone focuses on production proof.
- Reader-facing content metadata uses stable presentation labels and semantic dates rather than storage enums or raw ISO timestamps.
- The dedicated canonical deployment is `https://soji-web.vercel.app`; the unrelated `soji-official` project remains untouched.
- External mailbox, SMTP, Google-consent, service-role, and live role-transition checks remain human-gated and must not be promoted to PASS from repository tests.
- User directed GSD to continue with automatable later-phase work and consolidate all owner actions into one final checkpoint.
- [Phase 02]: Lost disputes and full refunds remain monotonic access blocks; only a later verified payment may supersede a full refund.
- [Phase 02]: Subscription and adjustment sync share one internal recomputation helper so subscription refreshes cannot erase unresolved billing blocks.
- [Phase 02]: Readiness is exposed as service-role-only named booleans, keeping production catalog rows and secrets private.
- [Phase 02]: Zero Invoice Payment mappings remain stable ignored outcomes, while ambiguous or malformed mappings fail before any adjustment RPC. — This preserves non-Soji receipts without guessing ownership and fails closed whenever provider evidence could attach an adjustment to the wrong member.
- [Phase 02]: Valid product metadata is the exclusive fast path; membership adjustments require one Invoice Payment, one subscription Invoice parent, and valid current Subscription metadata. — Product and membership state machines remain mutually exclusive and depend only on server/provider authority.
- [Phase 02]: Reconciliation may refresh active subscription state, but only an exact paid PaymentIntent and its provider paid timestamp can invoke paid-payment supersession. — The database retains authority over later, same-time, and older payment ordering so active status alone cannot erase a full-refund block.
- [Phase 02]: Account customer billing presentation consumes only normalized local adjustment evidence; provider payment and adjustment IDs stay outside the customer boundary. — This prevents operational Stripe identifiers and raw enums from leaking into customer rendering.
- [Phase 02]: Subscription presentation uses lost dispute, open dispute, full refund, partial refund, then underlying subscription eligibility priority. — Resolved disputes and partial refunds cannot independently promise access.
- [Phase 02]: Canceled and expired subscriptions never expose Portal management, and Checkout return banners remain informational. — Only exact durable local state may enable a financial action or active-access label.
- [Phase 02]: Admin billing search is limited to fixed event and minimized-reference paths; email-shaped and PostgREST grammar input never reaches the query. — This preserves bounded operational lookup without exposing customer email or accepting caller-controlled filter grammar.
- [Phase 02]: Receipt remains Received while processing independently maps Awaiting, In progress, Lease expired, Complete, No handler, or Failed. — Durable delivery evidence must never be conflated with the business processor outcome.
- [Phase 02]: Unsafe stored processing detail is replaced with a stable code before Admin API output. — Historical provider or database messages cannot cross the browser boundary even when a receipt is recoverable.
- [Phase 02]: Retry disables only its own record while search, reconciliation, and pagination retain independent pending and focus behavior. — Bounded recovery should not freeze unrelated incident-ledger operations or disrupt keyboard context.
- [Phase 02]: Provider PASS requires a live Stripe test-mode observation on the exact canonical origin. — Mocks, fixtures, repository tests, configuration, contracts, and dry runs cannot promote evidence.
- [Phase 02]: Every Phase 2 production preflight mode uses exact named inputs and fails closed. — Malformed, missing, duplicate, extra, dirty, untracked, or identity-mismatched state must block UAT.
- [Phase 02]: Production probes accept secrets only from the secure environment. — Probe output is limited to public commit or deployment identity and named readiness booleans.
- [Phase 02]: The initial Phase 2 evidence artifact remains exactly 25 PENDING rows. — Later plans promote rows one at a time only from observed canonical outcomes.
- [Phase 02]: Reconciliation closure uses a database-issued, customer-bound, expiring, single-use token. — Application clock skew cannot authorize stale subscription closure.
- [Phase 02]: The committed Web release is self-contained and verified from an exact detached revision. — Release gates must never borrow untracked files from the mutable working tree.
- [Phase 02]: Both reviewed billing migrations are one ordered evidence scope. — Production parity must end at `20260726010000` before provider UAT begins.
- [Phase 03]: Checkout requires a durable support destination, explicit policy approval, and Stripe Terms readiness. — Repository structure can be complete while external owner and provider truth remains pending.
- [Phase 03]: Policy readiness runs immediately after strict request validation and before provider or checkout-claim work. — Malformed input stays a 400, while a valid request cannot consume resources or contact Stripe when the customer trust path is incomplete.
- [Phase 03]: Every purchase action shows concise terms locally while Stripe Checkout owns required Terms acceptance. — Customers see material terms before redirect and acceptance remains canonical at the hosted payment boundary.
- [Phase 03]: Customer policy drafts describe current system behavior without invented entity, address, jurisdiction, arbitration, or service promises. — Production truth and later owner/legal review take precedence over false completeness.

### Pending Todos

- Complete the consolidated Phase 1 provider/Admin UAT checkpoint after all automatable phases are exhausted.
- Complete Phase 2 Plans 02-06 through 02-09 during the consolidated owner-authorized provider checkpoint.
- Discuss, plan, and execute Phase 3 automatable launch-content and policy work.
- Reuse the dedicated Vercel Web project for the v1 production deployment unless Phase 5 uncovers a blocking platform constraint.

### Blockers/Concerns

- Production Supabase service-role readiness, custom SMTP/DNS delivery, mailbox links, Google consent, and live Admin role/workspace acceptance require owner authorization or interaction.
- Stripe server secrets and provider-backed Checkout/webhook UAT require explicit owner authorization before any secret is uploaded to Vercel.
- Phase 2 production schema push, exact-commit deployment, Stripe catalog/Portal, receipt/recovery, and reversal evidence remain 25 truthful PENDING rows.
- Legal/support copy requires a business-owner or legal review before launch.
- The worktree contains extensive existing uncommitted changes; GSD initialization must not bundle or overwrite unrelated work.
- Phase 1 verification is `gaps_found`: canonical Vercel deployment, Supabase migration parity, Auth URL configuration, public readiness, provider switches, and first-Admin aggregate evidence are verified; external identity delivery and service-role-dependent checks remain open.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Mobile | Live Supabase Auth and RevenueCat IAP | Deferred to v2 | GSD initialization |
| Growth | Analytics, search, recommendation, community | Deferred until production evidence | GSD initialization |

## Quick Tasks Completed

| ID | Task | Completed | Commit |
|----|------|-----------|--------|
| 260730-iyl | Add accessible article and product sharing with copy fallback | 2026-07-30 | `61c4cff` |
| 260730-j74 | Add a device-local Saved reading list for Library guides | 2026-07-30 | `f78accb` |

## Session Continuity

Last session: 2026-07-28T05:10:24.693Z
Stopped at: Phase 5 UI-SPEC approved
Resume file: .planning/phases/05-production-deployment-and-rollback/05-UI-SPEC.md
