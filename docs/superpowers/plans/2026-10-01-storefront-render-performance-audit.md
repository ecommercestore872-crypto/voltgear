# Storefront render performance audit (A–Z)

**Goal:** No page shows an empty `main` with footer pinned to the viewport while content loads—especially PDP from TikTok/Instagram (`?ttclid=`, UTM). **Acceptance:** HTML includes meaningful above-the-fold content on first response; chrome does not depend on `useSearchParams` without a local Suspense boundary.

## Root cause (fixed in code)

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

## Phase 2 — PDP data & LCP (partial)

| Item | File | Status |
|------|------|--------|
| Cached PDP fetch, no review embed | `store.ts` `loadCachedPdpProductBySlug`, `product-pdp.ts` | Done |
| Server hero in buy box / gallery | `gadget-buy-box`, `product-gallery` | Review: ensure LCP image is `<img>` in RSC where possible |
| Reviews below fold only | `gadget-pdp-deferred.tsx` | Existing Suspense boundary |

## Phase 3 — Per-route audit (31 pages)

All under `apps/storefront/app/**/page.tsx`. Policy:

- **ISR catalog** (`revalidate = STOREFRONT_CATALOG_REVALIDATE`): home, products, category, collections, product PDP, search (if static parts).
- **Legal/static TTL**: cookies, privacy, terms, shipping, warranty, FAQ, about, contact.
- **Dynamic**: checkout, cart, order, track, write-review, delivery token, demo login, compare, wishlist, bulk-order, cod city, beta.

| Route | Chrome risk | `useSearchParams` | Notes |
|-------|-------------|-------------------|-------|
| `/` | Low | No | Hero LCP preconnect in layout |
| `/product/[slug]` | Low | No on shell | PDP cache + deferred widgets |
| `/products`, `/products/[category]` | Low | Client catalog only, **wrapped in Suspense** | OK |
| `/search` | Check | If client filters | Wrap client in Suspense |
| `/checkout` | Medium | Client forms | Must not block shell |
| `/cart` | Low | — | |
| `/collections/[slug]` | Low | — | ISR |
| `/[slug]` CMS | Low | — | |
| Legal pages | Low | — | |
| `/order/*`, `/track`, `/delivery/*` | Dynamic | — | Expected slower TTFB |

**Action:** Grep `useSearchParams` in `packages/shared` before each release; any usage in layout tree must be either removed (window + effect) or wrapped in **page-local** Suspense—not root layout.

## Phase 4 — Infra

| Item | Status |
|------|--------|
| Vercel region `syd1` vs PK traffic | Evaluate `bom1` / edge—measure TTFB |
| Supabase preconnect | In root layout `<head>` |
| Top ad slugs ISR warm | Cron or manual revalidate tags `pdp-product-{slug}` |

## Verification checklist (run before deploy)

1. `npm run test` — includes `storefront-shell-suspend.test.ts`
2. `npm run build:storefront`
3. Manual: open PDP with `?ttclid=test` — view source: breadcrumb + buy box HTML present; footer not sole content in `main`
4. Lighthouse mobile on PDP (WebPageTest optional)
5. Repeat spot-check: `/`, `/products`, `/checkout?from=gadget`

## Monitoring

- Vercel Web Vitals (LCP, TTFB) on `/product/*`
- Supabase query time on PDP embed (no reviews in first query)
