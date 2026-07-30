---
quick_id: 260730-lmi
title: Polished responsive global navigation
status: complete
created: 2026-07-30
---

# Quick Task Plan

## Goal

Upgrade Soji's global navigation so every page has clearer publication,
exploration, and account-action hierarchy. Preserve ordinary links and current
section semantics while making the mobile disclosure feel like an intentional
drawer that closes predictably by link activation, outside action, or Escape
and always restores focus correctly.

## Tasks

1. Restructure the shared navigation data and presentation so desktop keeps a
   quiet editorial link row with a visually distinct account action, while the
   mobile drawer adds concise destination context without changing link names.
2. Add a bounded mobile backdrop, outside-close behavior, route-change close,
   focus entry and restoration, body-scroll handling, and correct active state
   for query-based account destinations.
3. Verify guest/member rendering, keyboard and pointer closure, Back/Forward
   behavior, touch targets, 320px containment, prepared page scroll, reduced
   motion, accessibility, and the production build.

## Reference

- Ghost publication navigation separates primary and secondary navigation,
  commonly placing account or subscription actions at the right edge.
- GOV.UK service navigation keeps a named native navigation region controlled
  by an explicit mobile disclosure button.
- W3C's disclosure navigation example retains ordinary link semantics and
  closes on Escape with focus restored to the controlling button.
