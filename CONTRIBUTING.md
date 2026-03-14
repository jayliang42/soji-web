# Contributing

This repository uses a feature-branch + PR workflow. `main` should remain releasable.

## Team Workflow

1. Sync `main`

```bash
git checkout main
git pull origin main
```

2. Create a focused branch

```bash
git checkout -b feat/web-landing-redesign
```

3. Build and test locally before opening a PR

```bash
corepack pnpm --filter @soji/web build
corepack pnpm --filter @soji/web dev
```

If the change touches the app:

```bash
corepack pnpm --filter @soji/app dev
```

4. Commit with Conventional Commits

Examples:

- `feat(web): add minimal admin publishing flow`
- `fix(web): harden auth redirects and supabase fallbacks`
- `docs: add contribution workflow`

5. Push and open a PR to `main`

## Branch Rules

Use one branch per topic.

Good:

- `feat/auth-google-login`
- `feat/admin-content-form`
- `feat/web-campaign-redesign`
- `fix/content-preview-cta`

Bad:

- `misc-updates`
- `my-branch`
- `feature-everything`

## PR Rules

Each PR should solve one clear problem.

Good PR scope:

- add Google login
- redesign landing hero
- add Supabase seed SQL

Bad PR scope:

- redesign landing + change auth + add Stripe + update schema

If a change is large, split it:

1. schema/types
2. API/backend logic
3. UI/screens
4. polish

## Ownership Split

This project currently uses a two-agent collaboration model.

### Claude

Claude owns frontend styling only.

Claude may change:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- presentational components under `apps/web/src/components/**`
- visual-only changes in `apps/app/**`

Claude should not change:

- `apps/web/src/lib/**`
- `apps/web/src/app/api/**`
- `apps/web/middleware.ts`
- `packages/types/**`
- `packages/domain/**`
- `supabase/**`

Claude should avoid changing business logic, auth, permissions, billing, or schema.

### Codex

Codex owns product architecture, backend integration, data model, auth, billing, content logic, review, and conflict resolution.

Codex may change:

- `apps/web/src/lib/**`
- `apps/web/src/app/api/**`
- `apps/web/middleware.ts`
- `packages/types/**`
- `packages/domain/**`
- `supabase/**`
- cross-cutting app/web integration code

Codex may also review and refine Claude's UI work, but should preserve intentional visual direction unless there is a functional problem.

## Shared File Caution

These files are conflict hotspots and should have a single active owner at a time:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/lib/supabase/session.ts`
- `supabase/schema.sql`

Before making a large change to one of these files, announce ownership in the PR or team chat.

## Review Checklist

Reviewers should check:

- does the branch stay within its intended scope?
- does the change break auth, content access, or publishing?
- are mobile and desktop layouts still usable?
- are there screenshots for UI PRs?
- were build/test commands run?

## UI PR Expectations

If the PR changes UI, include:

- what page(s) changed
- before/after screenshots
- desktop and mobile screenshots when relevant
- confirmation that no backend or schema files were changed

## Backend PR Expectations

If the PR changes auth, content access, billing, or schema, include:

- what behavior changed
- what tables/API routes are affected
- validation steps
- rollback risk

## Merge Rules

Before merge:

- branch is up to date with `main`
- relevant build/test commands pass
- PR has clear summary and testing notes
- reviewers understand whether it is UI-only or logic-changing

## Quick Start For This Repo

1. Claude changes visual files only.
2. Codex reviews Claude changes before merge if they touch shared layouts/components.
3. Codex handles all logic and integration work.
4. Keep PRs small and single-purpose.
