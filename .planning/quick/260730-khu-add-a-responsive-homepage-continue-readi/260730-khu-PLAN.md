---
quick_id: 260730-khu
title: Homepage Continue reading
status: complete
created: 2026-07-30
---

# Quick Task Plan

## Goal

Make an unfinished guide discoverable from the homepage without showing stale
or unpublished titles, requiring an account, or making ordinary direct article
visits jump unexpectedly.

## Tasks

1. Match the newest meaningful incomplete device-local progress entry to a
   current published guide, ignoring completed, damaged, missing, or stale
   records.
2. Render a polished responsive Continue reading card below homepage outcomes
   with visible progress, device-local context, and one explicit Resume guide
   action that returns to the stored reading position.
3. Verify server-data failure, no-history, stale-history, direct-resume,
   keyboard/touch, 320px overflow, accessibility, first-viewport, and
   production build behavior.

## Reference

- Apple Books places current reading in a Continue section on Home.
- Medium exposes reading history as a reader-facing continuity feature.
- Soji keeps this first version device-local and validates stored progress
  against the current published content snapshot before displaying it.
