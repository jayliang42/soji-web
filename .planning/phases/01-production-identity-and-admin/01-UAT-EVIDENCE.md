# Phase 1 Production Identity and Admin Evidence

Environment: `https://<canonical-origin>`  
Evidence policy: redacted labels and boolean/version outcomes only.

| Scenario ID | Status | UTC date | Environment | Subject | Expected | Observed | Notes |
|---|---|---|---|---|---|---|---|
| INFRA-01-MIGRATIONS | PENDING | — | production | migration-history | local/remote versions match; no seed | not run | Follow the focused runbook. |
| INFRA-01-READINESS | PENDING | — | production | identity-readiness | six named checks true; source is Supabase | not run | Overall Stripe-dependent readiness is out of scope. |
| AUTH-01-SIGNUP | PENDING | — | production | mailbox-a + mailbox-b | two-provider delivery and canonical confirmation | not run | Store provider categories, never addresses. |
| AUTH-01-RECOVERY | PENDING | — | production | recovery-uat | canonical reset and new-password sign-in | not run | Use only the newest recovery message. |
| AUTH-02-GOOGLE | PENDING | — | production | google-uat | canonical callback and intended safe destination | not run | Record no provider codes. |
| ADMIN-01-BOOTSTRAP | PENDING | — | production | first-admin-history | member + admin; unchanged paid tier; audited source | carried-forward fact not inspected in this run | Do not rerun bootstrap. |
| ADMIN-01-ROLE-TRANSITION | PENDING | — | production | temporary-admin | audited grant/revoke and final-Admin rejection | not run | Use Admin Users only. |
| ADMIN-01-WORKSPACES | PENDING | — | production | role-boundaries | Admin workspaces pass; editor/member denied as designed | not run | Include live source labels. |

The ready validator must remain failing until every row is backed by a real observation
and marked `PASS`.
