# Phase 05 Pattern Map

## Purpose

Map every planned Phase 5 artifact to the closest existing Soji implementation so release
tooling preserves exact-commit, privacy, test, and documentation conventions.

## New/Modified Artifact Map

| Planned artifact | Role | Closest analog | Pattern to preserve |
|---|---|---|---|
| `scripts/check-phase5-release.mjs` | exact release, deployment lifecycle, and smoke parser | `scripts/check-phase2-uat-evidence.mjs` | Import-safe exports, strict separate-file inputs, exact commit/project/target checks, bounded normalized output, direct-execution guard |
| `scripts/check-phase5-release.test.mjs` | adversarial parser/CLI proof | `scripts/check-phase2-uat-evidence.test.mjs` | Temporary fixture repositories/files, `spawnSync` CLI assertions, wrong/missing/duplicate/secret cases |
| `scripts/check-phase5-container.mjs` | local immutable image/update/rollback drill | `scripts/check-deploy-artifact.mjs` + CI `container` job | Explicit targets, non-root/env rejection, bounded commands, exact cleanup ownership, stable status output |
| `scripts/check-phase5-container.test.mjs` | command-plan and safety tests | Phase 2 release-input CLI tests | Pure validation/plan functions, injected command runner, no real Docker in unit tests |
| `scripts/check-phase5-uat-evidence.mjs` | fixed automated/live ledger | `scripts/check-phase4-uat-evidence.mjs` | Nine-column rows, fixed IDs, proof classes, UTC canonical live PASS, privacy sentinels, structure/ready CLI |
| `scripts/check-phase5-uat-evidence.test.mjs` | evidence anti-fabrication tests | `scripts/check-phase4-uat-evidence.test.mjs` | Synthetic artifact builder, missing/duplicate/unknown/privacy/fixture tests, silent import |
| `05-UAT-EVIDENCE.md` | release truth ledger | `04-UAT-EVIDENCE.md` | Automated command+commit PASS, owner PENDING, no URLs/identities/full provider IDs |
| `docs/phase-5-production-deployment-and-rollback.md` | technical release procedure | `docs/phase-2-billing-and-fulfillment-uat.md` | Preflight → exact input → apply → inspect → observe → recover, explicit non-fabrication |
| `docs/phase-5-production-deployment-and-rollback.md` | platform operations guide | `docs/deployment.md` (read-only input) | Separate Vercel-primary and Docker-fallback paths; immutable artifacts and forward-only DB |
| Phase 4 consolidated checkpoint | sole login list | existing Phase 4 runbook | Append Phase 5 provider actions; do not create a second login checklist |
| `package.json` | deterministic commands | current Phase 1–4 scripts | `phase5:*:check` and `phase5:*:ready`, no watch mode |
| `package.json` | repeatable release gates | existing quality/database/e2e/container commands | CI-compatible commands, bounded timeouts, non-root image smoke |

## Release Parser Analogs

### Import-safe CLI boundary

Existing checkers:

1. export pure parsing/validation functions;
2. parse CLI arguments separately;
3. read files only in `runCli`;
4. detect direct execution with `fileURLToPath(import.meta.url)`;
5. set a nonzero exit code with stable messages rather than throwing provider output.

Phase 5 should keep this shape. Mutating Vercel commands must not run from import or from
default structure-check mode.

### Exact release proof

The Phase 2 validator already rejects:

- non-full commit values;
- dirty or non-detached release input;
- missing tracked release files;
- `.env` or `.vercel` contamination;
- incorrect project, target, state, alias, or deployment URL;
- deployment metadata that omits or disagrees with the expected commit.

Phase 5 should call/export this authority and add staged/current/rolled-back transition rules,
not weaken or fork these assertions.

### Smoke output minimization

Follow readiness and evidence patterns:

- accept an explicit target supplied out-of-band;
- permit only HTTPS Vercel deployment host or the one canonical origin;
- read status and allowlisted headers/JSON booleans;
- never retain response body, redirect target, cookies, headers, HTML, customer data, or error
  text;
- emit stable route/status/check names.

## Container Drill Analogs

The current CI container job already uses:

- an explicit image tag;
- an explicit container name;
- loopback-only port mapping;
- liveness polling;
- an `always()` cleanup step.

The Phase 5 drill should extend this into prior/candidate transitions with generated exact
temporary names. It must validate those names before any stop/remove operation, record which
resources it created, and refuse an arbitrary or empty target. Unit tests exercise the command
plan; one integration command exercises real Docker.

## Evidence and Documentation Analogs

The Phase 4 validator is the strongest general proof-class pattern:

- fixed automated and owner arrays;
- exactly one row per ID;
- automated PASS requires UTC, local repository, command, and commit;
- owner PENDING contains no observation;
- owner PASS requires UTC, canonical origin, live class, and redacted observation;
- ready mode fails every non-PASS row;
- whole-file privacy scanning.

Phase 5 adds deployment-specific rejections: generated deployment URLs, complete `dpl_`
identifiers, environment assignments, authorization material, provider logs, and account labels
that can identify a person.

## Integration/Conflict Notes

- The current worktree contains unrelated mobile/docs/seed/lockfile changes. Every GSD commit
  must name exact Phase 5 files; never stage all.
- `.planning/REQUIREMENTS.md` is user-owned/untracked and must not be included in Phase 5
  commits even if GSD state handlers update requirement status later.
- Vercel and production mutations are not unit-test side effects. The external plan must stop
  at one consolidated owner checkpoint.
- `docs/deployment.md` is pre-existing untracked user content and remains read-only. The new
  Phase 5 runbook must establish the correct `apps/web/vercel.json` working-directory/project-root
  instruction and add an automated source assertion without staging the old file.
- `.github/workflows/ci.yml` is also pre-existing untracked user content and remains read-only.
  Phase 5 exposes deterministic package commands that the workflow can call later.

---
*Pattern map complete: 2026-07-28*
