# Autopilot Honesty Implementation Plan

> **For agentic workers:** Implement in this session. TDD on rules, then pages.

**Goal:** Autopilot screens show only real shop facts and real controls.

**Architecture:** Pure snapshot helpers + server-rendered admin pages. Engines stay unused.

**Tech Stack:** Next.js 14, existing dashboard queries, node:test.

## Global Constraints

- Do not call courier or ad APIs from these pages.
- No ONLINE / hours saved / mock ROAS copy.
- Defaults stay off (`DEFAULT_AUTOPILOT_SETTINGS`).

## Tasks

1. Honesty snapshot + catalog-fact rules and tests.
2. Map `postex_tracking_number` onto orders so the count is real.
3. Replace settings and ads pages.
4. Keep existing Autopilot default tests green.
