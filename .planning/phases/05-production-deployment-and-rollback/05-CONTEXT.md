# Phase 5: Production Deployment and Rollback - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning
**Mode:** Autonomous recommendations accepted under the owner's instruction to continue all phases and consolidate login actions

<domain>
## Phase Boundary

Ship the verified Web application as one reversible, observable production service. This
phase covers exact-commit release inputs, a staged Vercel production deployment, readiness
and role-aware smoke gates, promotion, rollback/re-promotion proof, the existing portable
standalone Docker artifact, and auditable release evidence.

It does not launch the Expo app, accept live-mode payments before provider UAT, redesign
customer/Admin UI, add infrastructure providers, automate destructive database rollback,
or treat repository proof as evidence of a real production mutation.

</domain>

<decisions>
## Implementation Decisions

### Canonical Release Target and Promotion
- **D-01:** Reuse the dedicated `soji-web` Vercel project and canonical
  `https://soji-web.vercel.app` deployment. The unrelated `soji-official` project remains
  out of scope.
- **D-02:** Build from one clean detached exact Git commit. A mutable or dirty working tree,
  missing commit metadata, untracked release input, wrong project, or wrong target fails
  closed.
- **D-03:** Create a staged production deployment without assigning the canonical domain,
  run gates against that immutable deployment, then manually promote the same deployment.
  Do not rebuild between verification and promotion.
- **D-04:** Keep the Next.js standalone Docker image as a tested portable/self-hosted fallback
  artifact. It is not a simultaneous second canonical production entry point.
- **D-05:** Vercel Rolling Releases are optional and must not be assumed. The baseline works
  on a plan that supports staged production, manual promotion, and rollback to the immediately
  previous production deployment.

### Readiness, Smoke, and Traffic Acceptance
- **D-06:** Use three gates in order: exact-commit local release regression; staged production
  liveness/readiness/public smoke; then immediate canonical guest, customer, and Admin smoke
  after promotion.
- **D-07:** Staged promotion is blocked until demo mode is disabled, liveness is healthy,
  readiness returns `200`, build/deployment identity matches the verified commit, schema/type
  parity is green, and every prerequisite in the consolidated owner checkpoint is satisfied.
- **D-08:** A staged build may prove public routes, headers, liveness, readiness, configuration
  shape, and deployment identity. It cannot promote OAuth, mailbox, payment, receiver,
  scheduler, or privileged Admin rows without the required live observation.
- **D-09:** After promotion, immediately smoke the canonical home/discovery/policy routes,
  Auth callback path, representative customer access, Account, every role-appropriate Admin
  workspace, health/readiness, alerting, and scheduled cleanup. Keep payment acceptance and
  launch announcement closed until the smoke set passes.
- **D-10:** Any non-200 readiness, identity mismatch, demo source, protected-content leak,
  unauthorized action, payment-state contradiction, or critical smoke failure stops promotion
  or triggers immediate rollback.

### Rollback and Database History
- **D-11:** The rollback unit is the immediately previous known-good immutable Vercel
  production deployment. Never hot-fix an immutable deployment or rebuild an old commit and
  call that the same artifact.
- **D-12:** Database migrations are forward-only production history. App rollback requires
  expand/contract compatibility: the previous application must run safely against the
  post-migration schema. If it cannot, block the release before migration/promotion.
- **D-13:** Do not run ad hoc down migrations or restore a database snapshot as part of normal
  app rollback. A corrective schema change is a separately reviewed forward migration.
- **D-14:** The owner-authorized rollback drill is:
  promote candidate → canonical smoke → Instant Rollback → prior-deployment smoke →
  re-promote candidate → final smoke. Verify cron registration and public build configuration
  after both directions because they are deployment-sensitive.
- **D-15:** After rollback, account for Vercel's rollback state: normal automatic production
  assignment may remain disabled until a deployment is promoted again. The runbook must make
  recovery to normal promotion behavior explicit.

### Evidence, Privacy, and Owner Authority
- **D-16:** Phase 5 uses fixed automated and owner/provider evidence classes. Local commands
  may prove release scripts, the container, smoke parsers, redaction, and rollback state
  machines; they cannot prove Vercel mutation or canonical role flows.
- **D-17:** Deployment evidence may retain UTC, exact public Git commit, project/environment
  labels, bounded deployment identifier suffixes, gate outcomes, and rollback direction.
  It must not retain credentials, environment values, account identities, cookies, request
  headers, private locations, provider bodies, complete deployment IDs, or noncanonical URLs.
- **D-18:** Codex may complete all repository scripts, validators, documentation, tests,
  clean-detached-worktree checks, local production build, container smoke, and evidence
  structure without another login.
- **D-19:** Installing/changing production environment variables, creating the staged
  production deployment, promoting, rolling back, re-promoting, or using canonical role
  accounts remains one explicit owner-authorized external session.
- **D-20:** Append Phase 5 actions to
  `docs/phase-4-experience-and-operations-acceptance.md#consolidated-owner-checkpoint`.
  Do not create a competing login checklist or interrupt execution with fragmented prompts.
- **D-21:** A production `PASS` must come from machine-readable Vercel inspection plus direct
  redacted observation. Dashboard screenshots and hand-edited CLI captures are supporting
  diagnostics only.

### Codex Discretion
- Codex may choose script names, fixed evidence IDs, smoke route grouping, bounded retry
  timing, output schema, and local container orchestration as long as all gates remain
  deterministic, import-safe, privacy-safe, and non-mutating by default.
- Codex may strengthen the existing Phase 2 release-input/deployment parser rather than
  duplicate it.
- Codex may update the older Docker-first deployment document so Vercel is the primary v1
  path and Docker remains a clearly separated fallback.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contract
- `.planning/PROJECT.md` — launch boundary, deployment/security constraints, and Web-first decision.
- `.planning/REQUIREMENTS.md` — Phase 5 requirements `DEPLOY-01`, `DEPLOY-02`, and `DEPLOY-03`.
- `.planning/ROADMAP.md` — fixed Phase 5 goal and success criteria.
- `.planning/STATE.md` — canonical project decision, dirty-worktree constraint, and carried external gaps.
- `.planning/phases/04-experience-and-operations-acceptance/04-VERIFICATION.md` — verified local baseline and three Phase 4 live gaps.
- `.planning/phases/04-experience-and-operations-acceptance/04-UAT-EVIDENCE.md` — fixed proof-class and privacy precedent.

### Existing Release and Owner Contracts
- `docs/phase-4-experience-and-operations-acceptance.md` — sole consolidated Phase 1–4 owner checkpoint that Phase 5 must extend.
- `docs/phase-2-billing-and-fulfillment-uat.md` — exact detached release, schema preflight, deployment inspection, and provider UAT procedure.
- `scripts/check-phase2-uat-evidence.mjs` — reusable exact-commit release-input and Vercel deployment parser.
- `scripts/check-phase2-uat-evidence.test.mjs` — adversarial release-input, URL, identity, and deployment fixture coverage.
- `.planning/phases/02-billing-and-fulfillment-uat/02-REVIEW.md` — exact committed release closure and secret-hygiene review.
- `docs/launch-checklist.md` — current deployment, production configuration, readiness, provider, and owner gates.

### Deployment Implementation
- `apps/web/vercel.json` — Vercel framework and daily cleanup schedule.
- `.vercelignore` — production source exclusion boundary.
- `Dockerfile` — non-root Node 22 standalone image and liveness healthcheck.
- `apps/web/next.config.ts` — standalone output, public build-time configuration, CSP, and security headers.
- `scripts/check-deploy-artifact.mjs` — standalone entry/port/env-file rejection.
- `docs/deployment.md` — current Docker-first deployment/update/rollback runbook to reconcile with the selected Vercel path.
- `.github/workflows/ci.yml` — quality, database, browser, and container release gates.
- `package.json` — authoritative release and regression commands.
- `apps/web/src/app/api/health/route.ts` — dependency-free liveness contract.
- `apps/web/src/app/api/health/ready/route.ts` — fail-closed production readiness contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The Phase 2 validator already proves clean detached `HEAD`, tracked Vercel/Next/pnpm
  inputs, secret-free release files, exact project/target/state/alias, deployment URL shape,
  and full commit equality.
- `check-deploy-artifact.mjs` already verifies standalone server portability and rejects
  packaged environment files.
- The Dockerfile already builds with public values only, runs as `nextjs`, exposes a
  liveness `HEALTHCHECK`, and receives server secrets only at runtime.
- `/api/health`, `/api/health/ready`, the Admin Launch Checklist, and the Phase 4 evidence
  gate already expose bounded launch truth.
- Playwright already covers public, customer, Admin, accessibility, responsive, and
  protected-state workflows in deterministic local mode.

### Established Patterns
- Release input is an immutable commit, never the mutable working tree.
- Build-time public configuration and runtime secrets are separate.
- Liveness restarts processes; readiness gates traffic and payments.
- Production truth requires canonical/provider observation and cannot be inferred from mocks.
- Database migrations are forward-only and application release rollback is independent.
- Evidence uses fixed IDs, allowlisted fields, redacted identifiers, and fails closed.

### Integration Points
- Extend the Phase 2 release parser or add a Phase 5 wrapper for staged/current/rolled-back
  deployment states and promotion/rollback evidence.
- Add non-mutating smoke tooling around health, readiness, public headers/routes, and
  redacted role-check inputs.
- Add a local immutable-image run/update/rollback drill to CI or release validation.
- Reconcile `docs/deployment.md`, `docs/launch-checklist.md`, and the consolidated owner
  checkpoint around Vercel-primary and Docker-fallback paths.
- Add Phase 5 evidence and package scripts without staging unrelated mobile, seed,
  publisher-setup, documentation, or lockfile changes.

</code_context>

<specifics>
## Specific Ideas

- Use Vercel staged production (`--prod --skip-domain`) followed by promotion of the same
  deployment, so verification and traffic promotion do not rebuild different artifacts.
- Use Instant Rollback only to a deployment that previously served production. Hobby-plan
  compatibility means the guaranteed rollback target is the immediately previous deployment.
- Treat cron configuration and build-time public environment as deployment-versioned
  behavior that must be rechecked after rollback.
- Current official references:
  - https://vercel.com/docs/deployments/promoting-a-deployment
  - https://vercel.com/docs/instant-rollback
  - https://vercel.com/docs/cli/rollback
  - https://vercel.com/docs/environment-variables
  - https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Rolling Releases and Skew Protection are useful on eligible paid plans, but are not a
  baseline dependency for this milestone.

</specifics>

<deferred>
## Deferred Ideas

- Vercel Rolling Releases/canary traffic and Skew Protection remain an optional later
  optimization after plan capability and traffic justify them.
- A second canonical self-hosted Docker environment, multi-region failover, Kubernetes,
  and live Expo deployment remain outside v1.
- Live-mode payments and public traffic announcement remain blocked until the consolidated
  owner/provider checkpoint passes.

</deferred>

---
*Phase: 05-production-deployment-and-rollback*
*Context gathered: 2026-07-28*
