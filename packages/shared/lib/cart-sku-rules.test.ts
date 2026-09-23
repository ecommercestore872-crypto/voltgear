import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hydrateCartItemsFromStorage,
  mergeRetainedSku,
  tikTokContentIdForLine,
} from "./cart-sku-rules";

describe("cart SKU retention for TikTok content_id", () => {
  it("uses the same content_id across PDP, cart, checkout, and purchase when product SKU exists", () => {
    const sku = "VG-CH-65W";
    const slug = "fast-charger";
    const pdp = tikTokContentIdForLine({ slug, sku });
    const cart = tikTokContentIdForLine({ slug, sku });
    const checkout = tikTokContentIdForLine({ slug, sku });
    const purchase = tikTokContentIdForLine({ slug, sku });
    assert.equal(pdp, sku);
    assert.equal(cart, pdp);
    assert.equal(checkout, pdp);
    assert.equal(purchase, pdp);
  });

  it("prefers variant SKU over product SKU", () => {
    assert.equal(
      tikTokContentIdForLine({
        slug: "buds",
        sku: "SKU-PRODUCT",
        variantSku: "SKU-VARIANT",
        variantKey: "blk",
      }),
      "SKU-VARIANT"
    );
  });

  it("falls back to slug when SKU is genuinely absent", () => {
    assert.equal(tikTokContentIdForLine({ slug: "no-sku-product" }), "no-sku-product");
    assert.equal(
      tikTokContentIdForLine({ slug: "no-sku-product", variantKey: "v1" }),
      "no-sku-product::v1"
    );
  });

  it("keeps old carts without sku working via slug fallback", () => {
    const legacy = { slug: "legacy-buds", name: "Legacy", price: 100, quantity: 1 };
    const hydrated = hydrateCartItemsFromStorage([legacy])[0];
    assert.equal("sku" in hydrated, false);
    assert.equal(tikTokContentIdForLine(hydrated), "legacy-buds");
  });

  it("preserves sku through cart hydration/persistence round-trip", () => {
    const items = [
      {
        slug: "fast-charger",
        name: "Fast Charger",
        price: 4499,
        quantity: 2,
        sku: "VG-CH-65W",
      },
    ];
    const hydrated = hydrateCartItemsFromStorage(items);
    assert.equal(hydrated[0].sku, "VG-CH-65W");
    assert.equal(tikTokContentIdForLine(hydrated[0]), "VG-CH-65W");
  });

  it("mergeRetainedSku keeps existing sku and accepts incoming when empty", () => {
    assert.equal(mergeRetainedSku("KEEP", "NEW"), "KEEP");
    assert.equal(mergeRetainedSku(undefined, "NEW"), "NEW");
    assert.equal(mergeRetainedSku("  ", "NEW"), "NEW");
    assert.equal(mergeRetainedSku(undefined, undefined), undefined);
  });
});
