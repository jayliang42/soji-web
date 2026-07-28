# Phase 5 Production Deployment and Rollback

This runbook is the Vercel-primary release authority for Soji Web. The evidence ledger is
[05-UAT-EVIDENCE.md](../.planning/phases/05-production-deployment-and-rollback/05-UAT-EVIDENCE.md).
It never treats local tests, fixtures, dashboard settings, or screenshots as proof of a live
production transition.

All account access, configuration locations, canonical role checks, and provider actions are
listed once in the
[single coordinated owner checkpoint](./phase-4-experience-and-operations-acceptance.md#consolidated-owner-checkpoint).
Do not start a separate login checklist from this document.

## Release boundary

- Canonical application: the dedicated `soji-web` Vercel project.
- Canonical origin: `https://soji-web.vercel.app`.
- Vercel configuration lives at `apps/web/vercel.json`; run provider commands from the
  repository root with the project already linked to the correct Vercel project.
- Deploy only one clean detached exact Git commit.
- The Expo shell is not part of this release.
- Docker remains a tested portable fallback, not a simultaneous canonical production target.

## Local gate

Before any provider mutation, run:

```sh
corepack pnpm phase5:release:check
corepack pnpm phase5:uat:check
```

The first command covers unit, route, browser, database, type, build, standalone, documentation,
exact-input, image, and local rollback checks. It must run against the exact committed source.
The ready command is expected to remain nonzero until all direct external observations are done.

## Staged production candidate

Only after the coordinated owner checkpoint confirms all carried prerequisites:

1. Capture the current production deployment inspection in a permission-restricted temporary
   file.
2. From the validated detached commit, create a production deployment without assigning the
   canonical alias:

   ```sh
   vercel deploy --prod --skip-domain
   ```

3. Capture machine-readable inspection in a permission-restricted temporary file. Validate
   project `soji-web`, target `production`, state `READY`, exact commit, generated root Vercel
   origin, and absence of the canonical alias.
4. Run the fixed body-free smoke gate against the staged origin. Any readiness, identity,
   header, status, redirect, demo-marker, or privacy failure blocks promotion.

Generated origins, complete deployment identifiers, provider output, and response content stay
outside commits and evidence.

## Promotion and canonical smoke

Promote the same inspected candidate without rebuilding:

```sh
vercel promote
```

Re-inspect current production, then reload and check the canonical guest, customer, Admin,
receiver, and scheduler surfaces named in the single owner checkpoint. Keep traffic, payments,
and announcement closed until those checks pass. A critical contradiction triggers rollback.

## Rollback drill and recovery

The live drill is intentionally real and reversible:

1. Promote the candidate and finish canonical smoke.
2. Use Vercel Instant Rollback to restore the captured immediately previous known-good
   deployment.
3. Re-inspect the exact prior identity and repeat liveness, readiness, canonical public, and
   scheduler checks.
4. Re-promote the same candidate.
5. Re-inspect it as current, confirm normal production assignment is restored, and repeat the
   complete final smoke set.

If any transition fails, leave the last directly verified known-good deployment active. Never
rebuild an old commit and call it the same artifact.

## Database boundary

Database migrations are forward-only production history. The previous application must remain
compatible with the post-migration schema through expand/contract design. Do not use an ad hoc
down migration or database snapshot restore as part of ordinary application rollback. A schema
correction is a separately reviewed forward migration.

## Docker fallback

The repository also produces a Node 22 standalone image that runs as `nextjs`, exposes only
container port 3000, and uses loopback liveness. Verify it with:

```sh
corepack pnpm phase5:container:test
corepack pnpm phase5:container:drill
```

The drill accepts explicit immutable prior and candidate image tags, binds fixed loopback test
ports, and removes only exact generated resources it created. It does not prove Vercel state,
database rollback, provider configuration, or a second production endpoint.

## Evidence close-out

For live rows, retain only UTC, canonical environment label, the exact public Git commit,
permitted final-eight deployment suffix, lifecycle label, and a redacted outcome. Delete
permission-restricted temporary captures after the evidence validator passes. Then run:

```sh
corepack pnpm phase1:uat:check
corepack pnpm phase2:uat:check
corepack pnpm phase3:uat:check
corepack pnpm phase4:uat:check
corepack pnpm phase5:uat:check
corepack pnpm phase5:uat:ready
```

Any remaining `PENDING`, `BLOCKED`, or `FAIL` row keeps the release closed.
