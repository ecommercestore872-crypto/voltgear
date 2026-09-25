# T-41 Vercel shop hardening — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-09-25-t41-vercel-shop-hardening-design.md`

## Task 1 — Admin routes off shop

- Add `apps/admin/app/api/orders/[orderId]/status/route.ts`
- Add `apps/admin/app/api/orders/[orderId]/route.ts` (DELETE only)
- Add `apps/admin/app/api/indexnow/route.ts`
- Remove those handlers from `apps/storefront`
- **Verify:** `npm test`; admin order detail still updates status

## Task 2 — Cache & analytics CPU

- `sitemap.ts`: `revalidate = 3600`, drop `force-dynamic`
- Remove inline `runAnalyticsCleanup` from `/api/analytics/event`
- Call `runAnalyticsCleanup` from `/api/flows` cron
- **Verify:** `npm test`

## Task 3 — Guardrail test

- `storefront-shop-api.test.ts` documents forbidden shop paths
- **Verify:** `npm test`

## Task 4 — Deploy (human)

- Commit/push `origin`; production deploy **voltgear** only
- Enable Vercel usage alerts; screenshot Usage baseline
