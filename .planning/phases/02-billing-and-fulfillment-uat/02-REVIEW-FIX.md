---
phase: 02-billing-and-fulfillment-uat
fixed_at: 2026-07-26T22:59:43Z
review_path: .planning/phases/02-billing-and-fulfillment-uat/02-REVIEW.md
iteration: 4-release-closure
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-07-26T22:59:43Z  
**Source review:** `.planning/phases/02-billing-and-fulfillment-uat/02-REVIEW.md`  
**Iteration:** 4-release-closure

**Summary:**

- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: The reviewed commit omits required Phase 2 runtime and verification sources

**Status:** fixed  
**Files modified:** 212 release dependency paths; exact manifest below.  
**Commit:** `b80d915`  
**Applied fix:** Committed the complete transitive Web release surface needed by runtime routes, components, package imports, tests, local Supabase schema history, root build configuration, frozen dependency installation, and the standalone deploy artifact. The commit includes the required middleware deletion/move and a release-only lockfile snapshot whose mobile importer still matches the committed mobile manifest; mobile source, planning material, vault/editor files, governance files, and unrelated user artifacts were excluded. The Web typecheck wrapper now restores tracked `next-env.d.ts` after isolated route generation so exact-commit validation remains clean.

**Manifest controls:** 212 explicit paths; sorted manifest SHA-256 `6e84b9276ae1a2edd658ac41ba9770eb506cbf1ebfafdc63ffaef7ee6bec3020`. Before commit, the path allowlist reported zero forbidden roots. Added-line secret scanning found only synthetic `whsec_test` fixtures and webhook-prefix validation logic; no credential or non-placeholder secret value was present.

#### Deterministic CR-01 release dependency manifest

Status is relative to parent commit `e626649`. This block is the byte-for-byte output of:

`git diff-tree --no-commit-id --name-status -r b80d915 | LC_ALL=C sort`

```text
A	.dockerignore
A	.nvmrc
A	Dockerfile
A	apps/web/e2e/accessibility.spec.ts
A	apps/web/next-env.typecheck.d.ts
A	apps/web/playwright.config.ts
A	apps/web/public/well-endowed-hero.png
A	apps/web/src/app/api/account/billing-portal/route.ts
A	apps/web/src/app/api/account/purchases/[id]/download/route.ts
A	apps/web/src/app/api/admin/billing-events/reconcile/route.ts
A	apps/web/src/app/api/admin/office-hours/route.ts
A	apps/web/src/app/api/admin/product-assets/cleanup/route.ts
A	apps/web/src/app/api/admin/products/[id]/asset/route.ts
A	apps/web/src/app/api/admin/products/route.ts
A	apps/web/src/app/api/admin/upload/route.ts
A	apps/web/src/app/api/admin/users/roles/route.ts
A	apps/web/src/app/api/admin/users/route.ts
A	apps/web/src/app/api/cron/product-asset-cleanup/route.ts
A	apps/web/src/app/api/health/ready/route.ts
A	apps/web/src/app/api/health/route.ts
A	apps/web/src/app/icon.tsx
A	apps/web/src/app/manifest.ts
A	apps/web/src/app/office-hours/page.tsx
A	apps/web/src/app/products/page.tsx
A	apps/web/src/app/robots.ts
A	apps/web/src/app/sitemap.ts
A	apps/web/src/components/admin-content-editor.tsx
A	apps/web/src/components/admin-launch-checklist.tsx
A	apps/web/src/components/admin-office-hours-editor.tsx
A	apps/web/src/components/admin-product-asset-cleanup.tsx
A	apps/web/src/components/admin-products-editor.tsx
A	apps/web/src/components/admin-users.tsx
A	apps/web/src/components/cover-image-field.tsx
A	apps/web/src/components/data-state.tsx
A	apps/web/src/components/legacy-recovery-handler.tsx
A	apps/web/src/components/markdown-content.tsx
A	apps/web/src/components/markdown-editor.tsx
A	apps/web/src/components/membership-plan-grid.tsx
A	apps/web/src/components/plan-checkout-button.tsx
A	apps/web/src/components/product-checkout-button.tsx
A	apps/web/src/components/profile-setup-retry.tsx
A	apps/web/src/components/public-navigation.tsx
A	apps/web/src/lib/account-purchases.ts
A	apps/web/src/lib/admin-launch-checklist.ts
A	apps/web/src/lib/admin-metrics.ts
A	apps/web/src/lib/admin-users.ts
A	apps/web/src/lib/billing-processing.ts
A	apps/web/src/lib/billing-readiness.ts
A	apps/web/src/lib/checkout-return.ts
A	apps/web/src/lib/checkout.ts
A	apps/web/src/lib/content-image-validation.ts
A	apps/web/src/lib/cron-auth.ts
A	apps/web/src/lib/data-source.ts
A	apps/web/src/lib/entitlements.ts
A	apps/web/src/lib/login-copy.ts
A	apps/web/src/lib/observability.ts
A	apps/web/src/lib/office-hours.ts
A	apps/web/src/lib/product-asset-cleanup.ts
A	apps/web/src/lib/product-asset-validation.ts
A	apps/web/src/lib/product-checkout.ts
A	apps/web/src/lib/products.ts
A	apps/web/src/lib/publisher.ts
A	apps/web/src/lib/purchase-status.ts
A	apps/web/src/lib/rate-limit.ts
A	apps/web/src/lib/readiness.ts
A	apps/web/src/lib/request-security.ts
A	apps/web/src/lib/roles.ts
A	apps/web/src/lib/stripe-customer.ts
A	apps/web/src/lib/stripe-price-validation.ts
A	apps/web/src/lib/subscription-checkout.ts
A	apps/web/src/lib/supabase/admin.ts
A	apps/web/src/lib/supabase/client-types.ts
A	apps/web/src/lib/supabase/fetch.ts
A	apps/web/src/middleware.ts
A	apps/web/tests/account-purchases.test.ts
A	apps/web/tests/admin-billing-reconcile-route.test.ts
A	apps/web/tests/admin-content-route.test.ts
A	apps/web/tests/admin-launch-checklist.test.ts
A	apps/web/tests/admin-office-hours-route.test.ts
A	apps/web/tests/admin-product-asset-cleanup-route.test.ts
A	apps/web/tests/admin-product-asset-route.test.ts
A	apps/web/tests/admin-products-route.test.ts
A	apps/web/tests/admin-upload-route.test.ts
A	apps/web/tests/admin-user-roles-route.test.ts
A	apps/web/tests/admin-users-route.test.ts
A	apps/web/tests/admin-users.test.ts
A	apps/web/tests/auth-bootstrap-route.test.ts
A	apps/web/tests/auth-callback-route.test.ts
A	apps/web/tests/billing-portal-button.test.tsx
A	apps/web/tests/billing-portal-route.test.ts
A	apps/web/tests/billing-processing.test.ts
A	apps/web/tests/billing-readiness.test.ts
A	apps/web/tests/billing.test.ts
A	apps/web/tests/checkout-rate-limit-routes.test.ts
A	apps/web/tests/checkout-return.test.ts
A	apps/web/tests/checkout.test.ts
A	apps/web/tests/content-access.test.ts
A	apps/web/tests/content-image-validation.test.ts
A	apps/web/tests/cron-auth.test.ts
A	apps/web/tests/data-source.test.ts
A	apps/web/tests/discovery-metadata.test.ts
A	apps/web/tests/entitlements.test.ts
A	apps/web/tests/env.test.ts
A	apps/web/tests/health-routes.test.ts
A	apps/web/tests/login-copy.test.ts
A	apps/web/tests/markdown-content.test.tsx
A	apps/web/tests/middleware-security.test.ts
A	apps/web/tests/navigation.test.ts
A	apps/web/tests/observability.test.ts
A	apps/web/tests/plan-card.test.tsx
A	apps/web/tests/pricing-page.test.tsx
A	apps/web/tests/product-asset-cleanup-cron-route.test.ts
A	apps/web/tests/product-asset-cleanup.test.ts
A	apps/web/tests/product-asset-validation.test.ts
A	apps/web/tests/product-checkout.test.ts
A	apps/web/tests/product-download-route.test.ts
A	apps/web/tests/products-page.test.tsx
A	apps/web/tests/profile-bootstrap.test.ts
A	apps/web/tests/public-navigation.test.tsx
A	apps/web/tests/publisher.test.ts
A	apps/web/tests/purchase-status.test.ts
A	apps/web/tests/rate-limit.test.ts
A	apps/web/tests/readiness.test.ts
A	apps/web/tests/request-security.test.ts
A	apps/web/tests/revenuecat-route.test.ts
A	apps/web/tests/roles.test.ts
A	apps/web/tests/session-failure-pages.test.tsx
A	apps/web/tests/session.test.ts
A	apps/web/tests/stripe-customer.test.ts
A	apps/web/tests/stripe-price-validation.test.ts
A	apps/web/tests/stripe-webhook-route.test.ts
A	apps/web/tests/subscription-checkout.test.ts
A	apps/web/tests/supabase-fetch.test.ts
A	apps/web/tests/supabase-server.test.ts
A	apps/web/tests/theme-contract.test.ts
A	apps/web/tsconfig.typecheck.json
A	apps/web/vitest.config.mts
A	packages/domain/src/billing.ts
A	packages/domain/test/billing.test.mjs
A	scripts/check-deploy-artifact.mjs
A	scripts/sync-supabase-types.mjs
A	scripts/typecheck-web.mjs
A	supabase/.gitignore
A	supabase/migrations/20260714000000_baseline.sql
A	supabase/migrations/20260714010000_guard_paid_purchase_sync.sql
A	supabase/migrations/20260714020000_content_optimistic_concurrency.sql
A	supabase/migrations/20260714030000_product_optimistic_concurrency.sql
A	supabase/migrations/20260714040000_office_hour_optimistic_concurrency.sql
A	supabase/migrations/20260714050000_product_asset_optimistic_concurrency.sql
A	supabase/migrations/20260714060000_durable_product_asset_cleanup.sql
A	supabase/migrations/20260714070000_service_product_asset_cleanup.sql
A	supabase/migrations/20260714080000_lease_product_asset_cleanup.sql
A	supabase/migrations/20260714090000_lease_billing_event_processing.sql
A	supabase/migrations/20260714100000_minimize_stripe_billing_event_payload.sql
A	supabase/migrations/20260714110000_audited_first_admin_bootstrap.sql
A	supabase/migrations/20260714120000_protect_profile_identity.sql
A	supabase/migrations/20260715000000_prevent_duplicate_subscription_checkout.sql
A	supabase/migrations/20260715010000_prevent_duplicate_product_checkout.sql
A	supabase/migrations/20260715020000_index_billing_event_search.sql
A	supabase/migrations/20260715030000_block_no_payment_product_repurchase.sql
A	supabase/migrations/20260715040000_sync_product_refunds.sql
A	supabase/migrations/20260715050000_order_stripe_state_events.sql
A	supabase/migrations/20260715060000_distinguish_ignored_billing_events.sql
A	supabase/migrations/20260715070000_sync_product_disputes.sql
A	supabase/tests/database_access.sql
D	apps/web/middleware.ts
M	.gitignore
M	apps/web/.env.example
M	apps/web/next.config.ts
M	apps/web/package.json
M	apps/web/src/app/admin/page.tsx
M	apps/web/src/app/api/admin/content/route.ts
M	apps/web/src/app/api/auth/bootstrap/route.ts
M	apps/web/src/app/api/checkout/product/route.ts
M	apps/web/src/app/api/checkout/subscription/route.ts
M	apps/web/src/app/api/me/route.ts
M	apps/web/src/app/api/webhooks/revenuecat/route.ts
M	apps/web/src/app/api/webhooks/stripe/route.ts
M	apps/web/src/app/auth/callback/route.ts
M	apps/web/src/app/globals.css
M	apps/web/src/app/layout.tsx
M	apps/web/src/app/library/[slug]/page.tsx
M	apps/web/src/app/library/page.tsx
M	apps/web/src/app/page.tsx
M	apps/web/src/app/pricing/page.tsx
M	apps/web/src/components/admin-content-form.tsx
M	apps/web/src/components/admin-metrics.tsx
M	apps/web/src/components/auth-status.tsx
M	apps/web/src/components/content-card.tsx
M	apps/web/src/components/content-preview-cta.tsx
M	apps/web/src/components/content-source-badge.tsx
M	apps/web/src/components/logout-button.tsx
M	apps/web/src/components/plan-card.tsx
M	apps/web/src/components/section-shell.tsx
M	apps/web/src/lib/content-access.ts
M	apps/web/src/lib/content.ts
M	apps/web/src/lib/env.ts
M	apps/web/src/lib/navigation.ts
M	apps/web/src/lib/stripe.ts
M	apps/web/src/lib/supabase/browser.ts
M	apps/web/src/lib/supabase/profile.ts
M	apps/web/src/lib/supabase/server.ts
M	apps/web/src/lib/supabase/session.ts
M	apps/web/tailwind.config.ts
M	apps/web/tsconfig.json
M	packages/domain/package.json
M	packages/domain/src/index.ts
M	packages/domain/src/plans.ts
M	packages/types/src/index.ts
M	packages/ui/src/index.ts
M	pnpm-lock.yaml
M	supabase/schema.sql
```

### WR-01: The UAT gate cannot validate or attest the reconciliation-token migration

**Status:** fixed: requires human verification  
**Files modified:** `.planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md`, `docs/phase-2-billing-and-fulfillment-uat.md`, `scripts/check-phase2-uat-evidence.mjs`, `scripts/check-phase2-uat-evidence.test.mjs`  
**Commit:** `aeb04a4`  
**Applied fix:** Replaced the derived single migration version/suffix with the exact required filenames `20260726000000_subscription_billing_adjustments.sql` and `20260726010000_database_reconciliation_tokens.sql`. Pre-push accepts only both-pending or token-only pending history with matching dry-run filenames. Post-push requires exact local/remote parity ending at `20260726010000` and an empty dry run. Schema PASS evidence now records both exact filenames and the latest local/remote version. Fixtures cover both pending, token-only pending, both applied, extra versions/files, and a wrong token filename. The evidence ledger remains exactly 25 PENDING rows with no provider PASS.

### WR-02: A degraded Account session still renders authoritative access and download states

**Status:** fixed: requires human verification  
**Files modified:** `apps/web/src/app/account/page.tsx`, `apps/web/tests/account-billing-readiness-page.test.tsx`  
**Commit:** `199a32e`  
**Applied fix:** Made `snapshot.error` an unavailable prerequisite for all Account billing truth and actions. Degraded sessions now render neutral subscription and purchase unavailable panels, suppress Checkout confirmation, subscription and purchase presentations, Portal controls, download links, membership checkout/options, billing navigation actions, and role-derived Admin actions. Added a regression with a degraded snapshot plus an independently active subscription and downloadable purchase; it proves `Active`, `Access active`, `Download available`, `Download file`, billing controls, and confirmed-payment copy are absent.

## Verification

### Focused gates

- WR-01 Phase 2 evidence-validator suite: 20/20 passed.
- Combined Phase 1 + Phase 2 UAT-validator suite: 25/25 passed.
- Evidence safety gate: exactly 25 rows are PENDING; zero rows are PASS.
- WR-02 Account/session regression: 33/33 passed.
- Strict Web typecheck: passed.
- Web ESLint: passed.
- Full Web suite after WR-02: 76 files, 547/547 tests passed.

### Exact final commit gate

Validated detached commit `199a32e47e97199665690f599fda8fbf7a67d19d` without borrowing working-tree files:

- Detached status before validation: clean.
- `corepack pnpm install --frozen-lockfile`: passed; lockfile current, 1,066 packages installed.
- Workspace typecheck: passed for Types, UI, Domain, committed mobile manifest/source, and route-aware Web.
- Workspace tests: Domain 3/3 and Web 547/547 passed.
- UAT validator tests: 25/25 passed.
- Web production build: passed; 32 static/dynamic route entries generated.
- Deploy artifact check: passed; standalone artifact present, runtime-portable, and free of environment files.
- Supabase generated type parity: passed.
- Declarative schema reapply: passed; focused pgTAP 97/97.
- Database lint: passed with no schema errors.
- Full database suite: 2 files, 366/366 pgTAP assertions passed.
- Detached status after all install/typecheck/test/build/database/deploy gates: clean.

No production/provider mutation, provider login, secrets, or live billing action was used.

---

_Fixed: 2026-07-26T22:59:43Z_  
_Fixer: Codex (gsd-code-fixer)_  
_Iteration: 4-release-closure_
