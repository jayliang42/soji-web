---
quick_id: 260730-iyl
title: Accessible detail-page sharing
status: complete
created: 2026-07-30
---

# Quick Task Plan

## Goal

Add a consistent, accessible share action to public article and product detail
pages. Prefer the device share sheet when available, fall back to copying the
canonical browser URL, and preserve a manual-copy path when browser APIs fail.

## Tasks

1. Build a reusable client-side share control with explicit success,
   cancellation, clipboard fallback, and manual-copy states.
2. Add the control to article details and product purchase context without
   weakening the existing 44px touch-target and responsive layout contracts.
3. Cover behavior with focused unit, page-rendering, Playwright, accessibility,
   and production-build checks.

## Reference

- Ghost treats share links as standard post-template actions and allows them in
  a post footer, share bar, menu, or inline context.
- The Web Share API requires transient user activation and can reject with
  `AbortError` when the reader cancels, so cancellation is not presented as an
  application failure.
