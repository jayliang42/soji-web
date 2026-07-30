---
quick_id: 260730-jwd
title: Device-local guide reading progress
status: complete
created: 2026-07-30
---

# Quick Task Plan

## Goal

Help readers understand their position in a guide and intentionally return to
the last meaningful reading position without requiring an account, syncing
private history to Soji, or surprising them with an automatic jump.

## Tasks

1. Add bounded, defensive device-local progress persistence and deterministic
   reading-position calculations.
2. Add a responsive persistent progress surface to visible guide bodies with a
   native progress element, explicit Resume action, reduced-motion behavior,
   storage-unavailable fallback, and no progress tracking for hidden content.
3. Verify persistence, stored-position resume, keyboard/touch behavior,
   accessibility semantics, mobile overflow, visual hierarchy, and production
   build.

## Reference

- Apple Books uses a Continue surface and preserves a reader's place so they
  can pick up where they left off.
- Medium exposes reading history as part of its reader experience.
- W3C and MDN recommend a named native `progress` element when a determinate
  value is available.
