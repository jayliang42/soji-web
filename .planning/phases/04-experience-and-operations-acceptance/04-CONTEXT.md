# Phase 4: Experience and Operations Acceptance - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete launch-critical customer and Admin experience acceptance, make operational failure
alerts and scheduled private-file cleanup provably safe, and capture deterministic evidence.
This phase hardens and verifies existing workflows; it does not add new customer features,
analytics, search, notification products, or mobile purchase behavior.

</domain>

<decisions>
## Implementation Decisions

### Launch-Critical Experience Matrix
- **D-01:** Acceptance is workflow-first, not screenshot-first. Test the customer journey from entry through the truthful final state; pixel snapshots may support review but cannot replace semantic, keyboard, overflow, and state assertions.
- **D-02:** Cover public, login/recovery, Pricing, Shop, Library/detail, Office Hours, Account, and every Admin workspace at desktop and mobile. Reuse 320, 375, 768, 1024, and 1440 pixel widths where the surface can materially change.
- **D-03:** Every launch-critical data surface must prove loading, empty, success, unavailable, and recoverable failure states when those states exist. Tests must assert the exact supported next action and forbid contradictory actions.
- **D-04:** Access, payment, delivery, receipt, and processing truth remains server-owned. UI acceptance must verify that degraded session/provider data removes privileged actions rather than filling the gap with demo or optimistic state.
- **D-05:** Accessibility blocks release on serious or critical automated findings, broken heading/landmark order, unreachable primary actions, keyboard traps, focus loss after an operation, reduced-motion regressions, or horizontal overflow.

### Admin Density and Narrow-Screen Behavior
- **D-06:** Admin keeps full functional parity on narrow screens; do not hide billing recovery, user-role, content, product, Office Hours, or cleanup actions merely to simplify mobile.
- **D-07:** Prefer stacked operational cards and definition-style label/value groups below table-friendly widths. Preserve the scan order: identity/subject, receipt state, processing outcome, timing/attempts, then the one supported action.
- **D-08:** Receipt and processing are always separate labeled concepts. A stored receipt may coexist with awaiting, in-progress, complete, ignored/no-handler, or failed processing; color alone never communicates the distinction.
- **D-09:** Search, filters, pagination, Retry, and reconciliation keep independent pending states. Completing an action retains keyboard focus near the affected record and announces the exact result without moving the operator unexpectedly.
- **D-10:** Destructive or irreversible operations keep explicit confirmation and state the affected object in plain language. Phase 4 does not introduce bulk deletion or new Admin capabilities.

### Operations Alert Contract
- **D-11:** A durable local log/event remains the first record of failure. The optional operations webhook is a bounded secondary channel and must never become payment receipt or processing authority.
- **D-12:** Alert payloads use a small versioned contract: stable event code, severity, subsystem, UTC occurrence time, environment, retryability, and bounded redacted reference when necessary. Never include email, raw provider/database messages, request headers, cookies, tokens, secrets, payloads, signed URLs, or response bodies.
- **D-13:** Missing or invalid `OPS_ALERT_WEBHOOK_URL` is an explicit not-configured readiness state. A configured receiver uses HTTPS, a short timeout, no redirect following, and no credentials in the URL.
- **D-14:** Alert delivery failure is logged locally with a stable secondary-delivery code and does not recursively alert. It does not erase, replace, or falsely change the original business operation result.
- **D-15:** Automated acceptance uses a controlled local receiver and verifies exact structure, timeout/failure behavior, and redaction. A real production receiver observation remains external evidence and cannot be promoted from a mock.

### Scheduled Private-File Cleanup
- **D-16:** Scheduled cleanup and Admin cleanup continue to call the same lease-based executor. The scheduled route adds no alternate deletion path and never operates directly from a caller-supplied storage path.
- **D-17:** `CRON_SECRET` must be at least 32 trimmed characters. Authorization compares the exact Bearer value without leaking which part failed; missing, malformed, and incorrect requests receive one stable denial.
- **D-18:** Successful scheduled output is limited to stable status and aggregate claimed/cleaned/failed counts. It never returns storage paths, signed destinations, customer data, service-role detail, or raw Storage/Supabase errors.
- **D-19:** Partial Storage failure remains durable and retryable through the cleanup job state machine. A scheduler invocation must not report success when claiming or attempt recording fails.
- **D-20:** Repository tests prove authentication, lease behavior, redaction, and failure handling. A production scheduler invocation with the real secret remains one consolidated owner/provider observation.

### Evidence and Release Truth
- **D-21:** Phase 4 uses fixed evidence IDs split between command-backed automated proof and canonical owner/provider observations. Configuration presence and test fixtures cannot promote alert delivery, scheduler delivery, or privileged production Admin rows.
- **D-22:** Evidence records commands/commits for automated PASS and UTC canonical redacted outcomes for live PASS. No secret values, receiver destinations, storage paths, user identities, or full provider IDs enter the ledger.
- **D-23:** Carry Phase 1–3 external gaps forward without re-asking for them during local Phase 4 work. Add only the Phase 4 alert receiver, scheduler invocation, and any indispensable privileged Admin observations to the final consolidated checkpoint.

### Codex Discretion
- Codex may refine responsive breakpoints, spacing, status-chip treatment, card/table composition, microcopy, and focus-announcement implementation while preserving the decisions above.
- Codex may group acceptance work into customer, Admin, and operations plans and may strengthen existing components rather than creating parallel replacements.
- Codex may choose the exact evidence schema and stable alert codes, provided privacy, fixed-ID, proof-class, and non-fabrication rules remain enforceable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contract
- `.planning/PROJECT.md` — product value, launch boundary, modular-monolith constraint, and quality expectations.
- `.planning/REQUIREMENTS.md` — Phase 4 requirements `OPS-02`, `UX-01`, and `UX-02`.
- `.planning/ROADMAP.md` — fixed Phase 4 goal and four success criteria.
- `.planning/STATE.md` — carried provider gaps, single-checkpoint instruction, and current repository state.
- `.planning/phases/03-launch-content-and-customer-policy/03-VERIFICATION.md` — completed automated baseline and external truth still pending.

### Product and UI Contracts
- `docs/soji-product-design.md` — launch workflows, customer truth states, and minimum acceptance.
- `docs/soji-ui-style-guide.md` — editorial/Admin hierarchy, responsive behavior, accessibility, and review checklist.
- `docs/launch-checklist.md` — current operations-alert, cleanup, accessibility, and launch gates.
- `.planning/ui-reviews/UI-REVIEW.md` — prior six-pillar UI findings and remaining cross-surface concerns.

### Customer and Browser Acceptance
- `apps/web/e2e/public-pages.spec.ts` — deterministic customer, Admin, responsive, policy, security, and leak scenarios.
- `apps/web/e2e/accessibility.spec.ts` — axe, keyboard, reduced-motion, zoom, and policy coverage.
- `apps/web/playwright.config.ts` — desktop/mobile projects and isolated deterministic server.
- `apps/web/src/lib/data-source.ts` — live/demo authority and unavailable-state behavior.
- `apps/web/src/lib/supabase/session.ts` — fail-closed session/profile/role state.

### Admin Operations
- `apps/web/src/app/admin/page.tsx` — role-aware workspace routing, data snapshots, and launch checklist integration.
- `apps/web/src/components/admin-billing-events.tsx` — independent receipt/processing presentation, search, Retry, and reconciliation.
- `apps/web/src/components/admin-product-asset-cleanup.tsx` — cleanup history, pending state, and Admin reconciliation.
- `apps/web/src/lib/admin-launch-checklist.ts` — production configuration and operational-readiness presentation.

### Alerts and Scheduled Cleanup
- `apps/web/src/lib/observability.ts` — local logging and optional operations webhook delivery.
- `apps/web/src/lib/env.ts` — alert receiver and cron-secret validation.
- `apps/web/src/lib/product-asset-cleanup.ts` — shared lease-based cleanup executor and stable failure outcomes.
- `apps/web/src/lib/cron-auth.ts` — scheduled-route Bearer authorization.
- `apps/web/src/app/api/cron/product-asset-cleanup/route.ts` — scheduled cleanup API boundary.
- `apps/web/src/app/api/admin/product-assets/cleanup/route.ts` — role-checked manual cleanup boundary.
- `docs/deployment.md` — scheduler, environment, rollout, and operational verification procedures.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DataStatePanel`, policy layout, SectionShell, form status regions, and launch-checklist items already provide semantic empty/error/status primitives.
- `AdminBillingEvents` already separates receipt and processing, keeps actions independently pending, paginates evidence, and exposes supported recovery.
- `reportOperationalError` already logs locally and sends a bounded secondary alert through the validated receiver.
- `processDueProductAssetCleanupJobs` and `processProductAssetCleanupJob` already implement claim, lease, Storage deletion, durable attempt recording, and retryable failure.
- Existing Vitest, pgTAP, and 102-scenario Playwright infrastructure can be extended without adding a test framework.

### Established Patterns
- Configured live sources are authoritative; degraded live state never becomes demo success.
- Stable public error codes replace provider/database detail.
- Customer UI is calm and editorial; Admin is denser but semantic and action-oriented.
- Provider and owner observations remain separate from repository proof.
- Shared operations validators drive readiness and runtime behavior.

### Integration Points
- Extend customer/Admin browser matrices rather than creating another parallel suite.
- Harden the alert payload/delivery boundary and connect exact status to readiness/evidence.
- Exercise the existing scheduled cleanup route and shared executor across auth, success, partial failure, and retry.
- Add a Phase 4 evidence ledger/runbook that feeds the final consolidated owner checkpoint.

</code_context>

<specifics>
## Specific Ideas

- Ghost's current membership Portal keeps account, subscription management, policy notice, and support access in one coherent member surface; Soji should preserve that direct action-to-support relationship without copying its modal presentation.
- Ghost's editor preview supports public/member/paid views across desktop and mobile; Soji's acceptance matrix should likewise test the same content under representative authority states instead of relying on one happy-path screenshot.
- Stripe Dashboard and Workbench separate successful/failed requests, related resources, and operational inspection; Soji Admin should retain its simpler receipt-versus-processing incident ledger rather than becoming an analytics dashboard.
- The desired Admin feel is compact and decisive: one visible state hierarchy, one supported recovery action, no raw identifiers, no hidden mobile-only gaps, and no decorative charting.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 acceptance and operations scope.

</deferred>

---

*Phase: 04-experience-and-operations-acceptance*
*Context gathered: 2026-07-28*
