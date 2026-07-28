---
phase: 05-production-deployment-and-rollback
researched: 2026-07-28
status: complete
sources: official-vendor-and-repository
---

# Phase 5: Production Deployment and Rollback Research

## Research Question

What must be known to plan an exact-commit, staged, reversible Soji Web release without
confusing local proof with owner-authorized production truth?

## Executive Summary

The repository already contains most release foundations: a standalone non-root Docker image,
secret-free artifact verification, health/readiness routes, complete CI gates, a Vercel project
configuration, and unusually strong Phase 2 exact-commit/deployment parsing. Phase 5 should
compose and extend those controls rather than invent a new deployment system.

The safest Vercel baseline is a source deployment from a clean detached exact commit using
`vercel --prod --skip-domain`, followed by inspection and staged smoke, then
`vercel promote` of that same deployment. Vercel documents that `--skip-domain` disables
automatic domain assignment for the production deployment and that promotion later assigns
the production domains without rebuilding. This removes artifact skew between test and
promotion.

Instant Rollback repoints production domains to a deployment that previously served
production. The Hobby baseline guarantees the immediately previous production deployment;
paid plans may offer more targets. Rollback can also revert deployment-versioned cron
configuration and old builds may contain stale build-time public values, so the rollback
drill must repeat identity, cron, liveness, readiness, and smoke checks. Database history
remains forward-only.

## Current Repository Baseline

### Exact release identity

`scripts/check-phase2-uat-evidence.mjs` already provides:

- clean detached-worktree validation against a full expected commit;
- tracked release-input and `.env`/`.vercel` exclusion checks;
- Next.js standalone, pnpm, and Vercel config validation;
- Vercel deployment JSON parsing;
- exact project `soji-web`, production target, `READY` state, canonical alias, deployment
  URL shape, public deployment ID, and commit equality gates.

Its adversarial Node tests cover dirty inputs, secret-like values, malformed deployment URLs,
wrong targets/states/projects, missing commit metadata, and separate expected-commit files.
Phase 5 can export or wrap the relevant functions and add staged/current/rollback state proof.

### Artifact and container

- `Dockerfile` builds with public `NEXT_PUBLIC_*` arguments only, copies standalone output,
  runs as UID/GID 1001 `nextjs`, and defines dependency-free liveness.
- `scripts/check-deploy-artifact.mjs` requires the standalone server entry, checks runtime
  `PORT`, and recursively rejects environment files.
- CI already builds the image, asserts the non-root user, starts it on loopback, and smokes
  liveness/home before removal.

The current container job proves one startup, not immutable update/rollback behavior. A Phase 5
local drill can run two tagged fixtures or two candidate image references through
start → health → replace → health → rollback → health without production credentials.

### Application gates

- `/api/health` is process liveness and has no provider dependency.
- `/api/health/ready` combines demo-mode, site, Supabase public/admin/service-role,
  Stripe, membership catalog, and webhook readiness using bounded outputs.
- Phase 4 Playwright proves all customer/Admin UI contracts locally.
- The Phase 4 ledger and validator already define proof classes and privacy rules suitable
  for Phase 5 evidence.

## Official Vercel Guidance

### Staged production

Vercel CLI documents:

- `vercel --prod --skip-domain` creates a production deployment without automatically
  promoting the project domains;
- `vercel promote [deployment-id or url]` assigns production domains later;
- deployment command stdout is the generated deployment URL;
- source deployment preserves Vercel system variables and normal framework build behavior;
- local `--prebuilt` deployments can miss system environment variables at build time, so
  they are not the default for this Next.js release.

Planning implication: use the clean detached source directory and an authenticated owner
session for the mutating deploy. Capture stdout/inspection into permission-restricted temporary
files, validate them, and never hand-edit provider JSON.

### Environment variables

Vercel environment variables are environment-specific and apply only to new deployments.
Changing project settings does not mutate an already-built deployment. `NEXT_PUBLIC_*` values
affect the build/browser bundle, while server secrets remain runtime inputs.

Planning implication: validate names/readiness, never values; create a new staged production
deployment after any environment change; do not assume rollback rebuilds with current public
values.

### Promotion and rollback

Vercel distinguishes staged, promoted, and current production deployments. Promotion changes
the current deployment without rebuilding. Instant Rollback repoints production to a prior
eligible deployment; Hobby supports the immediately previous deployment, while Pro/Enterprise
can select more eligible production deployments. After rollback, automatic production-domain
assignment is disabled until rollback is undone by promoting a deployment.

Planning implication: evidence needs previous/candidate/current identities, transition order,
and post-transition checks. The runbook must explicitly re-promote the candidate to restore
normal promotion state after a successful drill.

### Cron behavior

Vercel currently sends configured `CRON_SECRET` as `Authorization: Bearer ...` and updates
cron configuration on redeploy. Rollback may restore the prior deployment's cron definition.

Planning implication: verify cron registration after candidate promotion, rollback, and
re-promotion. Soji's stricter minimum of 32 trimmed characters remains authoritative even
though Vercel documents a lower recommendation.

## Recommended Technical Shape

### Plan slice 1 — release and smoke tooling

Create import-safe release helpers with fixed, allowlisted output:

- exact Git commit and clean detached release input;
- deployment inspection normalized to project, target, state, bounded deployment suffix,
  full public commit for internal comparison, alias booleans, and lifecycle state;
- HTTP smoke result normalized to route code, status, security-header booleans, demo/source
  booleans, and no response bodies;
- transition validation for `staged → current → rolled-back → current`.

Reuse Phase 2 parsers where possible. Mutating CLI commands belong in a runbook or explicit
`--apply` mode guarded by separate owner-supplied input; default scripts must be read-only.

### Plan slice 2 — local immutable artifact rollback drill

Strengthen container release proof:

- build/inspect non-root image;
- verify no environment file in standalone output or image history/config;
- start a known-good image on loopback;
- start candidate under a different temporary name/port;
- require liveness and safe public smoke;
- switch the test target, then restore the prior target;
- clean up only exact temporary names created by the drill.

The drill proves procedure mechanics, not a production Vercel rollback.

### Plan slice 3 — evidence and owner checkpoint

Create a Phase 5 fixed evidence ledger:

Automated rows should cover exact release input, dependency lock, tests, standalone artifact,
non-root image, local update/rollback drill, smoke parser, privacy validation, and docs.

Owner/provider rows should cover:

- environment/readiness prerequisites complete;
- staged production exact commit and no canonical alias;
- staged liveness/readiness/public smoke;
- promotion and canonical HTTPS identity;
- guest/customer/Admin smoke;
- cron and alert observation;
- rollback to prior deployment;
- prior-deployment smoke;
- candidate re-promotion and final smoke.

Append these actions to the existing Phase 4 consolidated owner checkpoint. Ready mode must
fail only on those truthful external rows after automated commands pass.

## Pitfalls and Mitigations

| Pitfall | Consequence | Required mitigation |
|---|---|---|
| Deploying the dirty working tree | Unreviewed or missing release inputs | Detached exact-commit gate; deploy only that directory |
| `vercel --prod` without skip-domain | Immediate traffic switch before staged gates | Require `--skip-domain`; mutating command remains owner-authorized |
| Rebuilding during promotion | Tested artifact differs from served artifact | Promote the inspected deployment ID/URL |
| Using preview config as production proof | Wrong public values or provider dependencies | Production-target staged deployment plus readiness |
| Treating `READY` deployment state as app readiness | Build success masks provider/config failure | Require `/api/health/ready` 200 separately |
| Saving CLI/provider logs verbatim | IDs, URLs, identities, or secret-bearing output leak | Parse allowlisted fields; store suffixes/outcomes only |
| Rolling back schema | Shared data corruption or history divergence | Forward-only expand/contract; app-only rollback |
| Forgetting rollback state | Future pushes no longer auto-assign domains | Explicit re-promotion and status check |
| Assuming cron survives unchanged | Cleanup silently stops or changes cadence | Recheck cron after every deployment transition |
| Claiming local container as Vercel proof | False production completion | Separate automated and owner/provider evidence classes |

## Validation Architecture

### Frameworks

- Node built-in test runner for parsers, transition state, privacy, and CLI fixtures.
- Vitest for existing health/readiness application behavior.
- Playwright for local full experience and optional explicit canonical smoke input.
- Docker CLI for exact local image/config/rollback drill.
- Existing Supabase pgTAP/type tools for schema history and compatibility.

### Fast task feedback

- Parser/evidence tests: under 2 seconds.
- Focused health/readiness and smoke tests: under 10 seconds.
- Artifact/config inspection: under 30 seconds after build.
- Container drill: target under 3 minutes.

### Full release gate

Run Domain/Web tests, lint, typecheck, build, deploy artifact check, full Playwright,
schema repeatability, full pgTAP, generated types, documentation, Phase 1–5 evidence
structure, container build/smoke/rollback drill, and ready-mode negative proof.

### Manual-only truth

Production environment mutation, staged deployment creation, promotion, canonical role
smoke, provider observations, rollback, and re-promotion require owner authority. The
validator must require UTC canonical redacted observations and reject fixture/config proof.

## Sources

Official Vercel documentation:

- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/cli/deploying-from-cli
- https://vercel.com/docs/deployments/promoting-a-deployment
- https://vercel.com/docs/instant-rollback
- https://vercel.com/docs/cli/rollback
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/cron-jobs/manage-cron-jobs

Repository sources are listed in `05-CONTEXT.md`.

---
*Research complete: 2026-07-28*
