# Storefront render performance audit (A–Z)

**Goal:** No page shows an empty `main` with footer pinned to the viewport while content loads—especially PDP from TikTok/Instagram (`?ttclid=`, UTM). **Acceptance:** HTML includes meaningful above-the-fold content on first response; chrome does not depend on `useSearchParams` without a local Suspense boundary.

## Root cause (fixed)

1. Root `layout.tsx` wrapped `AppChrome` in `Suspense` with a full-viewport fallback.
2. `AppChrome` and `CartDrawer` called `useSearchParams()`, which suspends during static/ISR render when query strings exist.
3. Combined effect: shell + footer render, `main` empty until client hydration—reads as “loads from footer.”

## Phase 1 — Shell (done)

| Item | File | Status |
|------|------|--------|
| Remove root Suspense around chrome | `apps/storefront/app/layout.tsx` | Done |
| Attribution / gadget session via `window.location.search` | `packages/shared/components/layout/app-chrome.tsx` | Done |
| Cart drawer same pattern | `packages/shared/components/cart/cart-drawer.tsx` | Done |
| Regression tests | `packages/shared/lib/storefront-shell-suspend.test.ts` | Done |

## Phase 2 — PDP data & LCP (done)

| Item | File | Status |
|------|------|--------|
| Cached PDP fetch, no review embed | `store.ts` `loadCachedPdpProductBySlug`, `product-pdp.ts` | Done |
| Server LCP hero + deferred interactive gallery | `gadget-pdp-server-hero.tsx`, `gadget-pdp-product-grid.tsx` | Done |
| Variant color sync to gallery | `gadget-pdp-variant-context.tsx`, buy box `syncGalleryVariant` | Done |
| Reviews below fold only | `gadget-pdp-deferred.tsx` | Done |

## Phase 3 — Per-route audit (done)

| Route | Mitigation |
|-------|------------|
| All shop pages | Shell no longer suspends on query strings |
| `/product/[slug]` | Server hero + cached PDP + deferred reviews |
| `/products`, `/products/[category]` | Catalog client reads `window.location.search`; optional Suspense fallback kept |
| `/search` | Server `searchParams` only (no client suspend) |
| Checkout / cart / order / track | Dynamic by design; shell not blocked |

**Release gate:** `storefront-shell-suspend.test.ts` — no `useSearchParams` in shell or catalog client.

## Phase 4 — Infra (done)

| Item | Status |
|------|--------|
| Vercel region `bom1` (closer to PK than `syd1`) | `apps/storefront/vercel.json` |
| Supabase + Cloudinary preconnect | `apps/storefront/app/layout.tsx` |
| ISR warm cron (home, products, top PDPs) | `GET /api/cron/warm-storefront` daily 04:00 UTC |

## Verification checklist

1. `npm run test`
2. `npm run build:storefront`
3. PDP with `?ttclid=test` — view source: `GadgetPdpServerHero` image + title in HTML
4. Lighthouse mobile on PDP
5. Spot-check `/`, `/products`, `/checkout?from=gadget`

## Monitoring

- Vercel Web Vitals (LCP, TTFB) on `/product/*`
- Cron warm logs: `/api/cron/warm-storefront`
