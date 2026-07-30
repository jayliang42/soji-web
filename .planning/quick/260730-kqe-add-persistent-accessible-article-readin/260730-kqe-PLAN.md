---
quick_id: 260730-kqe
title: Persistent article reading size
status: complete
created: 2026-07-30
---

# Quick Task Plan

## Goal

Let readers enlarge Soji guide body text from the article itself without
changing browser zoom, requiring an account, or making the surrounding product
interface oversized.

## Tasks

1. Add a bounded device-local reading-size preference with safe parsing,
   blocked-storage fallback, same-tab updates, and cross-tab synchronization.
2. Render an accessible Default/Larger control in the reading header and apply
   the choice only to guide prose while keeping reading-progress measurements
   current after reflow.
3. Verify persistence, keyboard/touch operation, 320px layout, progress
   compatibility, accessibility, server rendering, and the production build.

## Reference

- Apple Books exposes text-size controls in the reading appearance menu and
  keeps page appearance separate from the surrounding app UI.
- Safari exposes per-site text sizing rather than requiring whole-page zoom.
- Soji keeps the first version intentionally small: two clear choices, the
  existing editorial typeface, and device-local persistence.
