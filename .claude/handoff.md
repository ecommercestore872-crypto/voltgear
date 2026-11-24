# Handoff: per-product sale end time + countdown

**Goal:** admin sets sale price + end time (Pakistan time); PDP shows "Sale ends in HH:MM:SS" to the real end; after it, regular price everywhere (server clock); no end time = no timer.

**Files:** supabase/migrations/20261124000000_product_sale_end.sql (NOT applied), lib/product-sale-rules.ts(+test), lib/db/map.ts, store-catalog-store.ts, publish.ts, admin-product-write-store.ts, admin-product-form-rules.ts, pdp-client-payload.ts, types.ts, components/admin/product-form.tsx, components/gadget/gadget-buy-box.tsx, components/sections/urgency-ticker.tsx (SaleCountdown). All under packages/shared.

**Decisions**
- Raw `sale_price`/`sale_ends_at` stored; `withSale(product, Date.now())` applies it on the server. mapProduct(storefront) bakes it (checkout, lists); the cached PDP row stays raw and is baked per request, so expiry is exact.
- Sale columns saved by a follow-up UPDATE after the publish RPC (RPC left untouched).
- Sale ignored for variant-priced items (variants keep own price). Sale price must be < regular price.
- promo-store.ts is for promo codes; not touched.

**Next:** review + apply migration to prod; browser-check 390px/1440px with real Supabase; merge PR.
# Handoff: admin picks homepage products
Goal: admin chooses + orders homepage Featured / Best Sellers; "Best seller" label only on picks; empty = hidden.
Finding: `homepage_sections` is NOT read by the homepage (fetchPublicHomepageSections has no caller). Homepage uses collections + home slots (cached via fetchProductsForHomeSlots). Extended that instead.
Files: collection-store.ts (bestsellers auto rule no longer derived), collection-editor.tsx (picker for all modes, up/down order, order-aware dirty check), gadget-home-sections.tsx (Best Sellers rail hidden when no picks; no newest/"Explore products" fallback; Featured no longer falls back to rail), gadget-new-arrivals.tsx (pickLabel prop).
Decisions: no migration (collection_products.sort_order already stores order). No new Supabase reads.
Next: (1) real per-category best sellers needs a decision/migration; (2) browser check at 1440/390 with real data; (3) after merge, admin must pick products in Collections > Best Sellers (currently empty = hidden).
# Handoff: per-product free shipping
Goal: shipping free if EVERY cart item is flagged free-shipping OR subtotal >= site threshold; "Free delivery" shown only on flagged products.
Files: checkout-server.ts (any->every, `allFreeShipping` on ResolvedCheckout), site-config.ts (`isShippingFree`), checkout-pricing.ts + api/checkout/route.ts (server order path now applies the flag; before it ignored it), checkout-page-client.tsx (display matches), product-form.tsx label, product-card.tsx + gadget-buy-box.tsx (badge), tests: site-config-shipping.test.ts, db/publish.test.ts.
Decisions: no migration needed, `products.free_shipping` already exists (20261012000000). Promo free_shipping type untouched.
Next: review PR; `npm run test` runner fails locally (node rejects --test-isolation=none), run via CI; browser check at 390/1440 not done.


---

# Handoff: inline product video

## Goal
Show the admin-uploaded MP4 as the 2nd slide of the PDP gallery (muted, autoplay only while visible, loop, playsinline, poster, preload none until near, tap-for-sound, visible controls, reduced-motion respected) without hurting mobile PageSpeed/LCP.

## Files
- packages/shared/lib/product-gallery-video.ts (+ .test.ts): picks the uploaded file video (ignores Instagram/TikTok links), adds Cloudinary `q_auto,w_720,c_limit` transform.
- packages/shared/components/product/product-gallery-video.tsx: new player slide.
- packages/shared/components/product/product-gallery.tsx: inserts video as slide 2 + thumbnail with play icon; no zoom/lightbox on video.
- packages/shared/components/product/product-info-sections.tsx: ProductVideoSection (unused) now uses the shared helper.
- packages/shared/components/admin/product-form.tsx: "Product video (MP4)" field via the existing MediaField/upload route.

## Decisions
- No migration: `products.product_video` is already jsonb holding {url, cloudinaryPublicId, poster}; PDP shell query already selects it. Nothing to apply to production.
- Video element only mounts when its slide is selected, so first image stays the LCP and the MP4 is never fetched on load.
- product-video-modal.tsx untouched (still handles Instagram/TikTok link demo button).
- Swiping is disabled over the video (it would fight the scrub bar); thumbnails switch slides.

## Next step
- Upload a real MP4 on a product in admin, Publish, check on a phone. Vercel limits request bodies to ~4.5 MB, so larger Reels need a pasted hosted MP4 link (or a direct-to-Cloudinary upload later).
- Check gadget-video-pip doesn't double-play the same file on PDP.
- Run PageSpeed on a live URL after deploy.
- `npm run test` needs Node 23+ (`--test-isolation`); ran with Node 22 by invoking tsx directly.
