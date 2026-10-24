import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdminProduct } from "@/lib/db/admin-types";
import type { ProductDocument } from "@/lib/db/publish";
import {
  emptyProductDocument,
  productDocumentFromAdmin,
} from "./admin-product-form-rules";

function document(overrides: Partial<ProductDocument> = {}): ProductDocument {
  return {
    ...emptyProductDocument(),
    name: "Live Watch",
    slug: "live-watch",
    category: "watches",
    price: 5_000,
    ...overrides,
  };
}

function adminProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    _id: "product-1",
    name: "Live Watch",
    slug: "live-watch",
    category: "watches",
    price: 5_000,
    stockStatus: "in-stock",
    images: ["/watch.webp"],
    status: "published",
    draft: null,
    ...overrides,
  } as AdminProduct;
}

describe("emptyProductDocument", () => {
  it("returns complete independent defaults for a new product", () => {
    const first = emptyProductDocument();
    const second = emptyProductDocument();

    first.images.push("/changed.webp");
    assert.equal(second.images.length, 0);
    assert.equal(second.stockStatus, "in-stock");
    assert.equal(second.quantity, null);
    assert.equal(second.freeShipping, false);
  });
});

describe("productDocumentFromAdmin", () => {
  it("preserves existing merchandising and social links when editing live products", () => {
    const result = productDocumentFromAdmin(adminProduct({
      badge: "Merchant configured", instagramUrl: "https://www.instagram.com/reel/fixture/",
      tiktokUrl: "https://www.tiktok.com/@fixture/video/1",
    }), ["watches"]);
    assert.equal(result.badge, "Merchant configured");
    assert.equal(result.instagramUrl, "https://www.instagram.com/reel/fixture/");
    assert.equal(result.tiktokUrl, "https://www.tiktok.com/@fixture/video/1");
  });
  it("prefers the saved draft and preserves live-only commercial flags", () => {
    const product = adminProduct({
      isDemo: true,
      costPrice: 3_000,
      draft: document({
        name: "Draft Watch",
        slug: "draft-watch",
        costPrice: undefined,
        isDemo: undefined,
      }),
    });

    const result = productDocumentFromAdmin(product, ["watches"]);

    assert.equal(result.name, "Draft Watch");
    assert.equal(result.slug, "draft-watch");
    assert.equal(result.isDemo, true);
    assert.equal(result.costPrice, 3_000);
  });

  it("clears a category that no longer exists in shop types", () => {
    const result = productDocumentFromAdmin(adminProduct(), ["earbuds"]);

    assert.equal(result.category, "");
  });

  it("preserves deliberately cleared optional cost and compare-at prices", () => {
    const result = productDocumentFromAdmin(adminProduct({ costPrice: 3000, compareAtPrice: 6000,
      draft: document({ costPrice: null, compareAtPrice: null }),
    }), ["watches"]);
    assert.equal(result.costPrice, null); assert.equal(result.compareAtPrice, null);
  });

  it("hydrates current inventory for legacy and preserve drafts, regardless of stale snapshots", () => {
    for (const inventoryIntent of [undefined, { mode: "preserve" as const }]) {
      const result = productDocumentFromAdmin(adminProduct({ quantity: 2, stockStatus: "low-stock",
        draft: document({ quantity: 99, stockStatus: "in-stock", inventoryIntent }),
      }), ["watches"]);
      assert.equal(result.quantity, 2); assert.equal(result.stockStatus, "low-stock");
      assert.deepEqual(result.inventoryIntent, { mode: "preserve" });
    }
  });

  it("retains explicit adjustment values and the original revision when reloading a draft", () => {
    const inventoryIntent = { mode: "adjust" as const, expectedRevision: "2", quantity: 9, stockStatus: "out-of-stock" as const };
    const result = productDocumentFromAdmin(adminProduct({ quantity: 1, inventoryRevision: "10",
      draft: document({ quantity: 999, stockStatus: "in-stock", inventoryIntent }),
    }), ["watches"]);
    assert.equal(result.quantity, 9); assert.equal(result.stockStatus, "out-of-stock");
    assert.deepEqual(result.inventoryIntent, inventoryIntent);
  });

  it("returns new-product defaults when no product exists", () => {
    assert.deepEqual(productDocumentFromAdmin(null, ["watches"]), emptyProductDocument());
  });
});
