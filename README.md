# Soji Platform

Monorepo scaffold for a premium membership product with:

- `apps/web`: Next.js marketing site, membership flows, content library, admin shell, Stripe API routes
- `apps/app`: Expo app shell sharing plans, entitlements, and content models
- `packages/types`: shared domain types
- `packages/domain`: shared plan/content/access logic
- `packages/ui`: shared theme tokens
- `supabase`: starter schema and architecture notes

## Getting started

1. Install dependencies with `pnpm install`
2. Run the web app with `pnpm --filter @soji/web dev`
3. Run the Expo app with `pnpm --filter @soji/app dev`

## Environment

Create `apps/web/.env.local` with:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Collaboration

See [CONTRIBUTING.md](/Users/liangzhisong/PersonalProject/soji-web/CONTRIBUTING.md) for:

- branch naming
- PR rules
- testing expectations
- Claude vs Codex ownership split

## Resume Deployment

For a portfolio or resume deployment, the fastest path is:

1. Push the repo to GitHub
2. Import the repo into Vercel
3. Set the project root to `apps/web`
4. Add environment variables only if you want live integrations

Minimal showcase deployment:

- No custom domain required
- Vercel default domain is enough
- If Supabase or Stripe env vars are missing, the app falls back to demo content and demo session states

Recommended env vars for a fuller demo:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
