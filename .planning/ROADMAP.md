# Roadmap: Soji Web Production Launch

## Overview

This milestone converts an extensively implemented and tested brownfield application into an operated production service. Work proceeds from real identity and Admin access, through provider-backed billing proof, real launch content, UI/operations acceptance, and finally a reversible server rollout.

## Phases

- [ ] **Phase 1: Production Identity and Admin** - Establish the real Supabase, auth, SMTP, and publisher control plane.
- [ ] **Phase 2: Billing and Fulfillment UAT** - Prove Stripe catalog, receipt, subscription, product, refund, and dispute behavior with real test credentials.
- [x] **Phase 3: Launch Content and Customer Policy** - Replace demo operational inputs with real content, office-hour links, support, and policies. (completed 2026-07-28)
- [ ] **Phase 4: Experience and Operations Acceptance** - Close final UI/UX regressions and verify alerts and scheduled maintenance.
- [ ] **Phase 5: Production Deployment and Rollback** - Ship the standalone Web service through readiness, smoke, update, and rollback gates.

## Phase Details

### Phase 1: Production Identity and Admin
**Goal**: The publisher and customers can use real production identity services, and the publisher has an auditable Admin control plane.
**Depends on**: Nothing
**Requirements**: INFRA-01, AUTH-01, AUTH-02, ADMIN-01
**Success Criteria** (what must be TRUE):
  1. A new user can confirm email, sign in, reset the password, and sign in with the new password.
  2. A user can complete Google sign-in through the canonical production redirect.
  3. The publisher can complete the one-time Admin bootstrap and access every role-appropriate Admin workspace.
  4. Public and service-role Supabase readiness checks pass against the migrated production project.
**Plans**: TBD
**UI hint**: yes

### Phase 2: Billing and Fulfillment UAT
**Goal**: Customers can pay and receive the correct access, while the publisher can prove receipt and recover failed processing.
**Depends on**: Phase 1
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. Each membership plan creates exactly one correct Stripe test subscription and Account reflects the authoritative state.
  2. Admin can find every test webhook receipt, including failed and ignored outcomes, and can use the supported recovery action.
  3. A standalone product purchaser can access its private file, while refund and dispute states enforce the documented delivery policy.
  4. The customer can open Customer Portal and manage a subscription without creating fragmented Stripe customer history.
  5. Membership disputes pause, restore, end, or cancel access according to one documented and tested policy.
**Plans**: 9 plans

- [x] `02-01-PLAN.md` — Add atomic membership adjustments, shared access recomputation, schema tests, and generated types.
- [x] `02-02-PLAN.md` — Enforce Checkout authority and classify, dispatch, and reconcile Stripe billing events.
- [x] `02-03-PLAN.md` — Render authoritative Account billing truth with stable loading states.
- [x] `02-04-PLAN.md` — Build the bounded Admin billing incident ledger and recovery UI.
- [x] `02-05-PLAN.md` — Create the secret-safe 25-scenario evidence validator, artifact, and runbook.
- [ ] `02-06-PLAN.md` — Gate and apply production schema/configuration and deploy the exact verified commit.
- [ ] `02-07-PLAN.md` — Prove membership catalog, Customer reuse, Checkout, and Portal behavior in Stripe test mode.
- [ ] `02-08-PLAN.md` — Prove signed receipt, failure, Retry, and reconciliation behavior.
- [ ] `02-09-PLAN.md` — Prove refund/dispute policy, run final readiness, and expose one consolidated human review.
**UI hint**: yes

### Phase 3: Launch Content and Customer Policy
**Goal**: The live product contains real value, real service links, and the customer-facing policies required to sell it responsibly.
**Depends on**: Phase 2
**Requirements**: CONT-01, OPS-01, OPS-03
**Success Criteria** (what must be TRUE):
  1. Visitors and representative members see the correct full, preview, and locked states for real published content.
  2. Eligible users can use the real office-hour signup and replay destinations; ineligible users cannot see protected links.
  3. Customers can reach support, privacy, terms, and refund information from the site and before Checkout.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Experience and Operations Acceptance
**Goal**: Customer and Admin workflows are clear, responsive, accessible, and operational failures reach the publisher.
**Depends on**: Phase 3
**Requirements**: OPS-02, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. All launch-critical pages complete desktop/mobile keyboard, accessibility, overflow, loading, empty, and error-state acceptance.
  2. Admin users can navigate each workspace and accurately understand billing receipt and processing outcomes without contradictory actions.
  3. A controlled payment failure emits a structured operations alert without leaking customer or provider secrets.
  4. Scheduled private-file cleanup runs with the production secret and rejects unauthenticated invocation.
**Plans**: 4 plans

#### Wave 1

- [ ] 04-01: Lock customer/Admin workflow, responsive, accessibility, and focus acceptance.
- [ ] 04-02: Harden the versioned, redacted operations-alert contract and delivery boundary.
- [ ] 04-03: Prove exact scheduler authentication and lease-based cleanup failure semantics.

#### Wave 2 *(blocked on Wave 1 completion)*

- [ ] 04-04: Create fixed evidence, run the full regression, and consolidate owner/provider actions.
**UI hint**: yes

### Phase 5: Production Deployment and Rollback
**Goal**: Soji runs as a reversible, observable HTTPS Web service that is ready to accept real traffic and payments.
**Depends on**: Phase 4
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. The selected server serves the standalone artifact over the canonical HTTPS domain with demo mode disabled and no secrets embedded in the image.
  2. Liveness and readiness pass, required repository checks are green, and public/customer/Admin production smoke tests succeed.
  3. The operator can roll out a new image and restore the previous image using the documented procedure while preserving database history.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Production Identity and Admin | 3/3 | Human UAT gaps carried |  |
| 2. Billing and Fulfillment UAT | 5/9 | Production/provider UAT gaps carried |  |
| 2. Billing and Fulfillment UAT | 5/9 | In Progress|  |
| 3. Launch Content and Customer Policy | 5/5 | Complete   | 2026-07-28 |
| 4. Experience and Operations Acceptance | 0/4 | Planned | - |
| 5. Production Deployment and Rollback | 0/TBD | Not started | - |

## Coverage

- 18 of 18 v1 requirements map to exactly one phase.
- Mobile/RevenueCat and growth features remain in v2 and do not block the Web launch.
