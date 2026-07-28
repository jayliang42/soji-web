# Phase 5: Production Deployment and Rollback - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 05-production-deployment-and-rollback
**Mode:** `--auto`
**Areas discussed:** Release target and promotion, Readiness and smoke gates, Rollback and database boundary, Evidence and owner authority

---

## Release target and promotion

| Option | Description | Selected |
|---|---|---|
| Vercel staged production and manual promotion | Reuse the dedicated project, build production without domain assignment, then promote the verified artifact. | ✓ |
| Immediate Vercel production deployment | Assign the canonical domain as soon as build completes. | |
| Self-hosted Docker first | Make the standalone container the first canonical launch. | |

**User's choice:** Auto-selected the recommended staged Vercel path under the user's
instruction for Codex to continue autonomously.
**Notes:** Docker remains a tested portable fallback. Rolling Releases are optional rather
than assumed.

---

## Readiness and smoke gates

| Option | Description | Selected |
|---|---|---|
| Strict staged gate before promotion | Require exact commit, readiness, public smoke, and external prerequisites before promote. | ✓ |
| Promote after build and test live | Use canonical traffic as the primary verification environment. | |
| Promote with known gaps | Accept readiness or owner/provider gaps during promotion. | |

**User's choice:** Auto-selected strict staged gating.
**Notes:** Canonical role smoke runs immediately after promotion, while payment acceptance
and launch announcement remain closed.

---

## Rollback and database boundary

| Option | Description | Selected |
|---|---|---|
| Previous immutable deployment plus forward-compatible schema | Roll the app back instantly while preserving forward-only database history. | ✓ |
| Rebuild previous commit | Produce a new artifact from old source. | |
| Automatic down migration or snapshot restore | Reverse shared data state with every app rollback. | |

**User's choice:** Auto-selected immutable application rollback with expand/contract schema
compatibility.
**Notes:** The production drill includes rollback, prior smoke, candidate re-promotion, and
final smoke.

---

## Evidence and owner authority

| Option | Description | Selected |
|---|---|---|
| Automate repository proof and gate external mutations | Codex builds/tests tooling; one owner session performs production mutations and role smoke. | ✓ |
| Deploy immediately with existing CLI state | Treat cached local authentication as sufficient authority. | |
| Documentation only | Skip executable validators and local rollback proof. | |

**User's choice:** Auto-selected repository automation with explicit production authority.
**Notes:** Phase 5 actions extend the existing consolidated owner checkpoint; evidence retains
only allowlisted public/redacted release facts.

## Codex's Discretion

- Script boundaries, evidence IDs, retry timing, smoke grouping, and local container drill.
- Whether to extend Phase 2 parsers or wrap them, provided release identity remains exact.
- Reorganization of the Docker-first deployment guide into Vercel primary plus Docker fallback.

## Deferred Ideas

- Vercel Rolling Releases and Skew Protection on an eligible plan.
- Multi-region/self-hosted second production environment and Kubernetes.
- Live mobile deployment and live-mode payment opening.
