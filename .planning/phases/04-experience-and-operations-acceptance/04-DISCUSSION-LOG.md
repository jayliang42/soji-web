# Phase 4: Experience and Operations Acceptance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 04-experience-and-operations-acceptance
**Areas discussed:** Launch acceptance matrix, Admin narrow-screen density, operations alerts, scheduled cleanup

---

## Launch Acceptance Matrix

| Option | Description | Selected |
|---|---|---|
| Workflow-first semantic matrix | Test states, actions, keyboard, overflow, and privacy across representative widths | ✓ |
| Screenshot-first visual regression | Use visual diffs as the primary release signal | |
| Desktop happy path plus spot checks | Keep broad coverage limited to the largest viewport | |

**User's choice:** Codex autonomous recommended default.
**Notes:** Prior phases already established server-owned truth and five responsive acceptance widths. The workflow-first matrix preserves those decisions and makes failures diagnosable.

---

## Admin Narrow-Screen Density

| Option | Description | Selected |
|---|---|---|
| Full parity with stacked operational cards | Preserve every action and convert dense rows to semantic label/value groups | ✓ |
| Hide secondary operations on mobile | Show only the most common Admin actions below tablet width | |
| Force horizontal tables | Preserve desktop tables with sideways scrolling | |

**User's choice:** Codex autonomous recommended default.
**Notes:** Mobile is an acceptance surface, not a reduced product. State hierarchy and recovery remain visible without relying on wide tables.

---

## Operations Alerts

| Option | Description | Selected |
|---|---|---|
| Durable local record plus bounded secondary delivery | Log the original failure first, then send a small redacted versioned alert | ✓ |
| Webhook as operational authority | Treat receiver success as the source of incident truth | |
| Local logs only | Defer all external failure notification | |

**User's choice:** Codex autonomous recommended default.
**Notes:** This matches the existing receipt-first architecture and prevents alert failure from rewriting payment or cleanup truth.

---

## Scheduled Cleanup

| Option | Description | Selected |
|---|---|---|
| Shared lease executor with exact scheduled auth | Reuse the Admin executor, return aggregate results, and retain retryable jobs | ✓ |
| Scheduler deletes Storage paths directly | Add a separate lightweight deletion path | |
| Manual cleanup only | Remove scheduled acceptance from v1 | |

**User's choice:** Codex autonomous recommended default.
**Notes:** The existing job/RPC boundary already owns safety and idempotency; the scheduled route should prove it rather than bypass it.

---

## Codex's Discretion

- Exact component breakpoints, responsive card layout, microcopy, focus announcements, alert code names, and evidence schema.
- Plan grouping and whether a finding is fixed in a shared primitive or the owning surface.

## Deferred Ideas

None.
