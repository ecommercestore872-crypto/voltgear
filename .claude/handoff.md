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
