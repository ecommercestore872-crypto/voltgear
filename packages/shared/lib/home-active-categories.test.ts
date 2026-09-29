import assert from "node:assert";
import { describe, test } from "node:test";

import {
  activeCategorySlugSet,
  filterProductsToActiveCategories,
  slugSetFromShopTypeLinks,
} from "./home-active-categories";
import type { Product } from "./types";

function product(category: string): Product {
  return {
    _id: `id-${category}`,
    name: "Test",
    slug: "test",
    category,
    price: 1,
    stockStatus: "in-stock",
    status: "published",
    images: [],
    cloudinaryImages: [],
    featured: false,
    rating: 0,
    reviewCount: 0,
    quantity: 1,
  } as Product;
}

describe("home-active-categories", () => {
  test("filters products to active category slugs", () => {
    const active = activeCategorySlugSet([{ slug: "smartwatch" }, { slug: "earbuds" }]);
    const list = [
      product("smartwatch"),
      product("power-bank"),
      product("earbuds"),
    ];
    const out = filterProductsToActiveCategories(list, active);
    assert.deepStrictEqual(out.map((p) => p.category), ["smartwatch", "earbuds"]);
  });

  test("slugSetFromShopTypeLinks reads slug or href tail", () => {
    const set = slugSetFromShopTypeLinks([
      { slug: "charger", href: "/products/charger" },
      { href: "/products/tripod" },
    ]);
    assert.ok(set.has("charger"));
    assert.ok(set.has("tripod"));
  });
});
