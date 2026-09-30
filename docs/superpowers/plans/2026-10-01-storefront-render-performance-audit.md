# Storefront render performance audit (A–Z)

**Status:** Phase 1–4 complete for production `apps/storefront`. Ongoing: admin/infra hardening, CI TypeScript.

## Completed

| Area | Items |
|------|--------|
| Shell | No root Suspense; no `useSearchParams` in chrome/cart/catalog client |
| PDP | Cached product, server LCP, deferred gallery/reviews/deals cache |
| Search | Static ISR shell (~101 kB); `/api/catalog/search` |
| Checkout/Cart/Wishlist | Server trust shells; client routes code-split (`ssr: false`) |
| Track | Lazy `TrackOrder` |
| Analytics | TikTok deferred post-load; Clarity already deferred |
| Infra | `bom1`, warm cron (+ COD cities) |
| Data | `fetchRelatedProducts` per-product cache keys; cached deals + reviews |
| Legacy | `components/DEPRECATED.md`; shell copies synced; `legacy-tree-guard.test.ts` |
| Tests | Shell, warm, LCP, legacy guards in `npm run test` |

## Remaining (non-shop or lower priority)

- Apply Supabase migration `20261017000000_admin_customer_rollups_security_invoker.sql` on Final-store
- Re-enable TypeScript in Next build (currently `ignoreBuildErrors`) — incremental
- Remove legacy root `app/` tree when confirmed unused (see `app/DEPRECATED.md`)
- Home page: optional further section-level cache tuning

## CI

- GitHub Actions: `.github/workflows/storefront-ci.yml` — `npm run test` + `build:storefront` on `main` / PRs
- Local: `npm run ci:storefront`

## Verification

1. `npm run test`
2. `npm run build:storefront`
3. PDP `?ttclid=test` view-source
4. `/search?q=earbuds`, `/checkout`, `/cart`, `/wishlist`
