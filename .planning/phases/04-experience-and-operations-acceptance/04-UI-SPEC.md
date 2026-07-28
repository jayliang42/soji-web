---
phase: 04
slug: experience-and-operations-acceptance
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-28
reviewed_at: 2026-07-28T05:00:00Z
---

# Phase 04 — UI Design Contract

> Preserve Soji's warm editorial customer experience and compact operational Admin
> experience while making authority, processing, failure, and recovery unmistakable.

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing Tailwind design tokens; no generator |
| Preset | Not applicable |
| Component library | Existing Soji components; no third-party component library |
| Icon library | None required; actions keep visible text labels |
| Font | Georgia display; Inter/Helvetica body |

The focal point on customer screens is the truthful state heading plus its one supported
next action. The focal point in Admin is the active workspace heading followed by the
identity/subject → receipt → processing → timing → action scan order.

## Responsive Composition

| Width | Contract |
|-------|----------|
| 320–375px | Single-column cards; full text actions; no hidden workspace or recovery action |
| 768px | Stacked or two-column groups when labels retain readable measure |
| 1024–1440px | Table-friendly/grid composition with the same semantic order and actions |

Billing rows become stacked operational cards below table-friendly width. Search, filter,
pagination, Retry, and reconciliation remain independently operable. After an operation,
focus moves to the updated record heading or the exact result message; it never jumps to
the page start.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Status-label and inline gaps |
| sm | 8px | Compact metadata rhythm |
| md | 16px | Control and row spacing |
| lg | 24px | Card padding |
| xl | 32px | Workspace groups |
| 2xl | 48px | Section separation |
| 3xl | 64px | Page-level separation |

Exceptions: none.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 600 | 1.4 |
| Body | 16px | 400 | 1.6 |
| Heading | 24px | 600 | 1.3 |
| Display | 40px | 600 | 1.15 |

Use at most these two weights. Customer/editorial surfaces may use the display face;
compact Admin state headings use the body face.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f4f5f2` | Page background and calm negative space |
| Secondary (30%) | `#ffffff` | Cards, forms, operational rows |
| Accent (10%) | `#9b432b` | Active navigation, membership warning, primary focus accent |
| Success | `#2f6f3d` | Verified success only |
| Destructive/error | `#9b432b` | Failed/destructive state with text label and icon-free copy |

Accent is reserved for the active workspace indicator, the single primary action in a
section, membership warnings, and focus treatment. Receipt/processing status always has
a text label; color is supplementary.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Billing receipt label | `Receipt — Received and stored` |
| Processing labels | `Processing — Awaiting`, `In progress`, `Complete`, `No handler`, or `Failed` |
| Retry CTA | `Retry processing` |
| Reconcile CTA | `Reconcile from Stripe` |
| Cleanup CTA | `Retry due ({count})` |
| Empty billing heading | `No billing receipts match these filters.` |
| Empty cleanup body | `No private files are awaiting cleanup.` |
| Unavailable state | State what could not be verified, confirm the customer's access/payment was not changed, and provide the supported retry/support path |
| Generic recoverable error | Name the failed operation and the exact safe next action; never expose provider detail |
| Destructive confirmation | Name the content, product, role, or asset affected and state the irreversible outcome before confirmation |

Generic `Submit`, `OK`, `Save`, `Click here`, and bare `Retry` labels are prohibited.

## Interaction and Accessibility Contract

- One `h1`, ordered headings, `main` landmark, visible focus, and no keyboard trap.
- Serious or critical axe findings block release; axe does not replace keyboard,
  zoom, focus, reduced-motion, or semantic-state checks.
- Pending labels are operation-specific and independent.
- Result live regions announce the exact outcome once.
- Successful row operations retain focus at the affected row; failures focus the result.
- Degraded authority state removes Checkout, Download, Join, Replay, billing-management,
  Retry, or reconciliation commands when the server cannot prove they are safe.
- 200% text and every required viewport have no horizontal document overflow.
- Reduced motion disables nonessential transitions.

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
