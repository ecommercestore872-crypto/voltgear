# Handoff: per-product sale end time + countdown

**Goal:** admin sets sale price + end time (Pakistan time); PDP shows "Sale ends in HH:MM:SS" to the real end; after it, regular price everywhere (server clock); no end time = no timer.

**Files:** supabase/migrations/20261124000000_product_sale_end.sql (NOT applied), lib/product-sale-rules.ts(+test), lib/db/map.ts, store-catalog-store.ts, publish.ts, admin-product-write-store.ts, admin-product-form-rules.ts, pdp-client-payload.ts, types.ts, components/admin/product-form.tsx, components/gadget/gadget-buy-box.tsx, components/sections/urgency-ticker.tsx (SaleCountdown). All under packages/shared.

**Decisions**
- Raw `sale_price`/`sale_ends_at` stored; `withSale(product, Date.now())` applies it on the server. mapProduct(storefront) bakes it (checkout, lists); the cached PDP row stays raw and is baked per request, so expiry is exact.
- Sale columns saved by a follow-up UPDATE after the publish RPC (RPC left untouched).
- Sale ignored for variant-priced items (variants keep own price). Sale price must be < regular price.
- promo-store.ts is for promo codes; not touched.

**Next:** review + apply migration to prod; browser-check 390px/1440px with real Supabase; merge PR.
