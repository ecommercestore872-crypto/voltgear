# Handoff: per-product free shipping
Goal: shipping free if EVERY cart item is flagged free-shipping OR subtotal >= site threshold; "Free delivery" shown only on flagged products.
Files: checkout-server.ts (any->every, `allFreeShipping` on ResolvedCheckout), site-config.ts (`isShippingFree`), checkout-pricing.ts + api/checkout/route.ts (server order path now applies the flag; before it ignored it), checkout-page-client.tsx (display matches), product-form.tsx label, product-card.tsx + gadget-buy-box.tsx (badge), tests: site-config-shipping.test.ts, db/publish.test.ts.
Decisions: no migration needed, `products.free_shipping` already exists (20261012000000). Promo free_shipping type untouched.
Next: review PR; `npm run test` runner fails locally (node rejects --test-isolation=none), run via CI; browser check at 390/1440 not done.
