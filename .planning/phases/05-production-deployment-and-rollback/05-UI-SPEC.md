---
phase: 05
slug: production-deployment-and-rollback
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-28
reviewed_at: 2026-07-28T05:22:00Z
---

# Phase 05 — UI Design Contract

> Phase 5 adds no new customer interface. This contract freezes the verified Phase 4
> experience and defines the production smoke signals that must remain visually and
> semantically truthful across promotion and rollback.

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing Tailwind design tokens; no generator |
| Preset | Not applicable |
| Component library | Existing Soji components only |
| Icon library | None required; actions retain visible text |
| Font | Georgia display; Inter/Helvetica body |

No release-status banner, deployment ID, environment control, internal diagnostics, or
operator-only rollback control may be added to public/customer UI. Deployment identity and
rollout controls remain in provider tooling and evidence artifacts.

## Smoke Surface Contract

| Surface | Required production signal | Release-blocking contradiction |
|---------|----------------------------|--------------------------------|
| Global public shell | Canonical HTTPS, stable navigation/footer, one `main`, one `h1` | Demo/internal control, missing policy/support path, horizontal overflow |
| Home, Library, detail | Real source states and server-owned access projection | Demo content presented as live, restricted body or entitlement identifier exposed |
| Pricing and Products | Exact material terms and only currently authorized actions | Payment/price claim without readiness, optimistic success, unauthorized Checkout |
| Login/recovery | Provider-first hierarchy, safe recovery, canonical callback intent | Preview callback authority, account-existence leak, trapped keyboard path |
| Account | Durable access/payment state and safe recovery action | Return-query success treated as payment truth, contradictory Portal/Download action |
| Office Hours | Eligibility-specific state with protected targets omitted | Guest/ineligible target, stale demo destination |
| Admin workspaces | Full role-appropriate workspace parity and Phase 4 scan order | Demo preview accepted as production, receipt/processing conflation, unauthorized action |
| Policy/support | Public readable copy and working navigation | Missing route, blank content, purchase path without terms |
| Health/readiness | Machine-only bounded JSON | Secret, destination, catalog row, customer/provider detail |

## Responsive Composition

The Phase 4 contract remains locked:

| Width | Contract |
|-------|----------|
| 320–375px | Single-column customer/Admin cards, visible full-text actions, no overflow |
| 768px | Stacked/two-column groups only when reading and operational order remain intact |
| 1024–1440px | Table/grid composition with identical semantic truth and actions |

Production smoke samples 375px mobile and 1440px desktop on the canonical deployment.
The full local release suite continues to cover 320, 375, 768, 1024, and 1440 pixels.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline/status gaps |
| sm | 8px | Compact metadata |
| md | 16px | Controls and rows |
| lg | 24px | Card padding |
| xl | 32px | Workspace groups |
| 2xl | 48px | Section separation |
| 3xl | 64px | Page separation |

Exceptions: none. Phase 5 does not authorize visual restyling.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 600 | 1.4 |
| Body | 16px | 400 | 1.6 |
| Heading | 24px | 600 | 1.3 |
| Display | 40px | 600 | 1.15 |

Production smoke blocks on missing/duplicate primary headings, heading-order regression,
unreadable 200 percent text, or deployment/internal terminology entering customer copy.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f4f5f2` | Page background |
| Secondary (30%) | `#ffffff` | Cards and operational rows |
| Accent (10%) | `#9b432b` | One primary action, active navigation, visible focus |
| Success | `#2f6f3d` | Verified success only |
| Error/destructive | `#9b432b` | Labeled failure/destructive states |

Color never supplies deployment, payment, receipt, processing, or access meaning alone.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Demo marker prohibition | Canonical production must not contain `Demo preview` or `Preview data` |
| Readiness failure | Machine route returns stable named checks; customer actions remain unavailable without internal detail |
| Payment return | Informational return state only; Account names the durable verified outcome |
| Receipt state | `Receipt — Received and stored` |
| Processing state | Separately labeled `Awaiting`, `In progress`, `Complete`, `No handler`, or `Failed` |
| Recoverable customer failure | Name what is unavailable, confirm payment/access was not changed, give one safe next action |
| Admin recovery | Name the exact operation: `Retry processing`, `Reconcile from Stripe`, or `Retry due ({count})` |

Bare `Success`, `Something went wrong`, `Click here`, `Submit`, or generic `Retry` may not
replace the existing exact state/action language during release fixes.

## Interaction and Accessibility Contract

- Preserve one `main`, one `h1`, ordered headings, skip link, visible focus, and keyboard reachability.
- Serious/critical axe findings, focus loss, keyboard traps, overflow, reduced-motion
  regression, or 200 percent text failure block promotion.
- Receipt and processing remain distinct in every Admin Billing layout.
- Degraded or unknown authority removes Checkout, Download, Portal, Join, Replay, Retry,
  reconciliation, role, or content-management actions that cannot be proven safe.
- Promotion and rollback must not introduce stale client/server behavior in the smoke session;
  reload the canonical page before each transition check.
- Screenshots remain diagnostics, not evidence authority.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| None | None | PASS — existing local components only |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-28
