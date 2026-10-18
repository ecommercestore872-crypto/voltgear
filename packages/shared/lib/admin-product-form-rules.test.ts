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

  it("returns new-product defaults when no product exists", () => {
    assert.deepEqual(productDocumentFromAdmin(null, ["watches"]), emptyProductDocument());
  });
});
