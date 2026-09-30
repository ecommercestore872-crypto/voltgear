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

- Admin Supabase views / RLS lint fixes
- Re-enable TypeScript in CI for storefront
- Remove legacy `e commerce store/app/` when confirmed unused
- Home page: optional further section-level cache tuning
- Bundle budget automation in CI

## Verification

1. `npm run test`
2. `npm run build:storefront`
3. PDP `?ttclid=test` view-source
4. `/search?q=earbuds`, `/checkout`, `/cart`, `/wishlist`
