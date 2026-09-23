import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  orderProductsByIds,
  sliceRailProducts,
} from "@/lib/db/home-collection-batch";
import type { Product } from "@/lib/types";

function stubProduct(id: string): Product {
  return {
    _id: id,
    name: id,
    slug: id,
    price: 1,
    category: "misc",
    stockStatus: "in_stock",
  } as Product;
}

describe("orderProductsByIds", () => {
  it("preserves id order and skips missing products", () => {
    const byId = new Map([
      ["a", stubProduct("a")],
      ["c", stubProduct("c")],
    ]);
    assert.deepEqual(
      orderProductsByIds(["c", "b", "a"], byId).map((p) => p._id),
      ["c", "a"],
    );
  });

  it("handles duplicate ids in membership list", () => {
    const byId = new Map([["a", stubProduct("a")]]);
    assert.equal(orderProductsByIds(["a", "a"], byId).length, 2);
  });
});

describe("sliceRailProducts", () => {
  it("caps rails at eight items", () => {
    const items = Array.from({ length: 12 }, (_, i) => stubProduct(String(i)));
    assert.equal(sliceRailProducts(items).length, 8);
  });

  it("returns empty for empty input", () => {
    assert.deepEqual(sliceRailProducts([]), []);
  });
});