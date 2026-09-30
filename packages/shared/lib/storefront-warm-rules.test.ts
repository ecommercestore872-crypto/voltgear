import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Product } from "@/lib/types";

import {
  rankProductSlugsForWarm,
  warmPdpCacheTags,
  warmProductPaths,
} from "./storefront-warm-rules";

function product(partial: Partial<Product> & Pick<Product, "slug">): Product {
  return {
    _id: partial.slug,
    name: partial.name ?? partial.slug,
    slug: partial.slug,
    category: partial.category ?? "gadgets",
    price: partial.price ?? 1000,
    status: "published",
    featured: partial.featured ?? false,
    reviewCount: partial.reviewCount ?? 0,
    ...partial,
  } as Product;
}

describe("storefront-warm-rules", () => {
  it("ranks featured and reviewed products first", () => {
    const slugs = rankProductSlugsForWarm([
      product({ slug: "a", featured: false, reviewCount: 1 }),
      product({ slug: "b", featured: true, reviewCount: 0 }),
      product({ slug: "c", featured: true, reviewCount: 5 }),
    ]);
    assert.deepEqual(slugs.slice(0, 2), ["c", "b"]);
  });

  it("builds cache tags and warm paths", () => {
    assert.deepEqual(warmPdpCacheTags(["pad-x"]), ["pdp-product-pad-x"]);
    assert.deepEqual(warmProductPaths(["pad x"]), ["/product/pad%20x"]);
  });
});
