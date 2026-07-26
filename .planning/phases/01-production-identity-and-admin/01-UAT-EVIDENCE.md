# Phase 1 Production Identity and Admin Evidence

Environment: `https://soji-web.vercel.app`
Evidence policy: redacted labels and boolean/version outcomes only.

| Scenario ID | Status | UTC date | Environment | Subject | Expected | Observed | Notes |
|---|---|---|---|---|---|---|---|
| INFRA-01-MIGRATIONS | PASS | 2026-07-26 | production | migration-history | local/remote versions match; no seed | 21 local and 21 production versions matched from 20260714000000 through 20260715070000 | Production versions were read with a read-only Dashboard query after CLI authentication had expired; no push or seed was run. |
| INFRA-01-READINESS | BLOCKED | 2026-07-26 | production | identity-readiness | six named checks true; source is Supabase | canonical alias returned 200; demoModeDisabled, siteUrl, supabase, and supabasePublicOperational were true; supabaseAdmin and supabaseServiceRoleOperational were false; `/api/me` named Supabase | The production service-role secret is not installed in Vercel. Stripe-only readiness fields do not decide this Phase 1 row. |
| AUTH-01-SIGNUP | PENDING | — | production | mailbox-a + mailbox-b | two-provider delivery and canonical confirmation | email signup and confirmation are enabled; canonical Site URL and three controlled callback URLs are configured; live delivery not run | Custom SMTP is not configured, so two-provider delivery cannot pass yet. Store provider categories, never addresses. |
| AUTH-01-RECOVERY | PENDING | — | production | recovery-uat | canonical reset and new-password sign-in | not run | Use only the newest recovery message. |
| AUTH-02-GOOGLE | PENDING | — | production | google-uat | canonical callback and intended safe destination | Google is enabled in production Supabase; browser consent round trip not run | Record no provider codes. |
| ADMIN-01-BOOTSTRAP | PASS | 2026-07-26 | production | first-admin-history | member + admin; unchanged paid tier; audited source | one Admin role and one first_admin_bootstrap event; target retained member + admin, free tier, and no paid subscription | Read-only aggregate query; no identity values were recorded and bootstrap was not rerun. |
| ADMIN-01-ROLE-TRANSITION | PENDING | — | production | temporary-admin | audited grant/revoke and final-Admin rejection | not run | Use Admin Users only. |
| ADMIN-01-WORKSPACES | PENDING | — | production | role-boundaries | Admin workspaces pass; editor/member denied as designed | not run | Include live source labels. |

The ready validator must remain failing until every row is backed by a real observation
and marked `PASS`.
