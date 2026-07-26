---
phase: 01-production-identity-and-admin
verified: 2026-07-26T15:10:22Z
status: gaps_found
score: 0/4 must-haves verified
human_verification:
  - Two-provider email confirmation and password recovery
  - Google consent and canonical destination preservation
  - Live Admin role transitions and workspace boundaries
decision_coverage:
  honored: 20
  total: 20
  not_honored: []
---

# Phase 1: Production Identity and Admin Verification Report

**Phase Goal:** The publisher and customers can use real production identity services, and the publisher has an auditable Admin control plane.
**Verified:** 2026-07-26T15:10:22Z
**Status:** gaps_found

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | A new user can confirm email, sign in, reset the password, and sign in with the new password. | ✗ FAILED | Email signup and confirmation are enabled, but Supabase reports default email delivery; custom production SMTP and two-provider delivery are not configured or observed. |
| 2 | A user can complete Google sign-in through the canonical production redirect. | ? UNCERTAIN | Google is enabled, the Site URL is canonical, and `https://soji-web.vercel.app/auth/callback` is allowed; a real Google consent round trip has not been completed. |
| 3 | The publisher can complete the one-time Admin bootstrap and access every role-appropriate Admin workspace. | ✗ FAILED | One bootstrap event and one Admin were verified with member + Admin, free tier, and no paid subscription. Live workspace and later-role checks cannot pass while the deployed service-role path is unavailable and no Admin session has been exercised. |
| 4 | Public and service-role Supabase readiness checks pass against the migrated production project. | ✗ FAILED | 21 local and 21 production migrations match. Public operational readiness is true, but `supabaseAdmin` and `supabaseServiceRoleOperational` are false. |

**Score:** 0/4 truths fully verified

### Required Artifacts

| Artifact group | Expected | Status | Details |
|---|---|---|---|
| Auth redirect, stable-error, login, and browser-test artifacts | Canonical and privacy-safe identity journeys | ✓ EXISTS + SUBSTANTIVE + WIRED | `verify.artifacts` passed 5/5 for Plan 01 and `verify.key-links` passed 3/3. |
| Production UAT runbook, evidence, and validators | Secret-free authoritative evidence | ✓ EXISTS + SUBSTANTIVE + WIRED | `verify.artifacts` passed 4/4 for Plan 02 and `verify.key-links` passed 3/3. |
| Production evidence and launch checklist | Truthful live state | ✓ EXISTS + SUBSTANTIVE + WIRED | `verify.artifacts` passed 2/2 for Plan 03 and `verify.key-links` passed 2/2. |
| Canonical deployment configuration | Deployable Next.js Web project | ✓ EXISTS + FUNCTIONAL | Vercel deployment `dpl_9hX4k9LXs5HGMNjjfuzEEqGxAJmj` reached READY and aliased to `https://soji-web.vercel.app`. |

**Artifacts:** 12/12 verified

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Login form | Auth redirect builder | Signup and Google redirect options | ✓ WIRED | Plan 01 key-link validator passed. |
| Login form | Stable Auth error mapper | Operation-specific public copy | ✓ WIRED | Plan 01 key-link validator passed. |
| Auth redirect builder | Safe local navigation | Destination normalization | ✓ WIRED | Plan 01 key-link validator passed. |
| Package scripts | Evidence validator | `phase1:uat:check` and `phase1:uat:ready` | ✓ WIRED | Plan 02 key-link validator passed. |
| Launch checklist | UAT runbook and evidence | Production closeout documentation | ✓ WIRED | Plan 02 and Plan 03 key-link validators passed. |
| Vercel runtime | Production Supabase | Public URL and anon key | ✓ WIRED | Homepage CSP names the production Supabase origin; `/api/me` reports `source: "supabase"`. |
| Vercel runtime | Supabase service role | Server-only Admin client | ✗ NOT CONFIGURED | The production readiness probe reports both privileged Supabase checks false. |

**Wiring:** 6/7 production-critical connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|---|---|---|
| INFRA-01 | ✗ BLOCKED | Migration parity and public readiness pass, but production service-role readiness is false. |
| AUTH-01 | ✗ BLOCKED | Custom SMTP and two-provider confirmation/recovery observations are absent. |
| AUTH-02 | ? NEEDS HUMAN | Provider and callback configuration pass; real Google consent/callback evidence is pending. |
| ADMIN-01 | ✗ BLOCKED | First-Admin history passes; live role transition, final-Admin rejection, and workspace access are pending. |

**Coverage:** 0/4 requirements fully satisfied

### Decision Coverage

All 20 trackable `CONTEXT.md` decisions are honored by shipped artifacts.

## Behavioral Verification

| Check | Result | Detail |
|---|---|---|
| Web unit/component suite | ✓ 435 passed | 76 Vitest files, 0 failures. |
| Production Vercel build | ✓ passed | Next.js 15.5.18 compiled, type-checked, generated 32 pages, and deployed READY. |
| Production accessibility | ✓ 22 passed | Desktop and mobile serious/critical WCAG checks, skip link, and reduced motion. |
| Production responsive/auth/security checks | ✓ 30 applicable checks passed | Four Demo-only assertions expected localhost/Demo Account state and were separately verified with correct production canonical/login behavior. |
| Canonical HTTP checks | ✓ passed | Homepage and health returned 200; signed-out Account returned canonical 307 login redirect; malformed callback failed closed to canonical login; `/api/me` named Supabase. |
| Evidence safety structure | ✓ passed | `corepack pnpm phase1:uat:check` validates all eight redacted scenario rows. |
| Evidence ready gate | ✗ intentionally failing | Pending/blocked external scenarios and false privileged readiness prevent an incorrect Phase 1 PASS. |

## Test Quality Audit

| Test scope | Active | Skipped | Circular | Assertion level | Verdict |
|---|---:|---:|---:|---|---|
| Auth redirect/login/callback/recovery/reset tests | Active | 0 | 0 | Value + behavioral | ✓ |
| Evidence validator tests | Active | 0 | 0 | Value + structural safety | ✓ |
| Public browser identity tests | Active | 0 | 0 | Behavioral | ✓ |

No requirement-linked disabled tests or circular fixture-generation patterns were found.

## Anti-Patterns Found

No blocking source-code placeholders or unwired production artifacts were found. `PENDING` and `BLOCKED` markers in the UAT evidence are intentional truth-state records, not implementation stubs.

## Human Verification Required

### 1. Two-provider email confirmation and recovery

**Test:** After custom SMTP is configured, complete signup with two mailbox providers, confirm both links, run password recovery, set a new password, sign out, and sign in again.
**Expected:** Every message uses the approved sending domain and canonical callback, recovery does not enumerate accounts, and a used recovery link becomes invalid.
**Why human:** Mailbox delivery, one-time links, and credentials are external identity actions that must not be read or simulated by automation.

### 2. Google canonical sign-in

**Test:** Start from `/login?next=/admin`, complete Google consent, and observe the return destination.
**Expected:** The production Supabase project returns through the canonical callback and preserves the safe `/admin` destination.
**Why human:** Google account consent is an external identity authorization.

### 3. Admin roles and workspaces

**Test:** As the current Admin, grant and revoke a temporary second Admin, observe audit entries and final-Admin rejection, then verify Admin/editor/member workspace boundaries.
**Expected:** Later changes are audited, the final Admin cannot be removed, and every role sees only its intended workspaces.
**Why human:** This requires a live privileged session and controlled production identities.

## Gaps Summary

### Critical Gaps

1. **Privileged Supabase runtime is absent**
   - Missing: `SUPABASE_SERVICE_ROLE_KEY` in the dedicated Vercel production project.
   - Impact: Phase 1 privileged readiness and live Admin data operations cannot pass.
   - Resolution: Obtain explicit owner authorization, install the server-only secret in `soji-web`, redeploy, and require both named checks to become true.

2. **Custom SMTP and sender-domain proof are absent**
   - Missing: Approved SMTP provider plus SPF, DKIM, and selected DMARC policy.
   - Impact: AUTH-01 cannot prove production delivery or canonical confirmation/recovery.
   - Resolution: Configure the provider/DNS once, then run the two-provider UAT.

3. **External identity and live role observations remain pending**
   - Missing: Mailbox link clicks, Google consent, current-Admin role transitions, and workspace observations.
   - Impact: AUTH-01, AUTH-02, and ADMIN-01 cannot be marked PASS.
   - Resolution: Complete the single consolidated human checkpoint and rerun `phase1:uat:ready`.

## Recommended Closure

Continue using existing Plan `01-03`; no duplicate gap plan is needed. Once the consolidated external setup and identity actions are complete:

1. Recheck `/api/health/ready` and `/api/me`.
2. Complete the three human verification groups above.
3. Update only observed evidence rows.
4. Run `corepack pnpm phase1:uat:check`, `corepack pnpm phase1:uat:ready`, and `corepack pnpm docs:check`.
5. Rerun Phase 1 verification.

## Verification Metadata

**Verification approach:** Goal-backward from ROADMAP success criteria
**Must-haves source:** ROADMAP Phase 1 success criteria
**Automated checks:** 499 passed or verified (435 unit/component, 52 production browser, 12 artifact checks)
**Human checks required:** 3 groups
**Schema drift:** none
**Total verification time:** 11 min

---
*Verified: 2026-07-26T15:10:22Z*
*Verifier: Codex*
