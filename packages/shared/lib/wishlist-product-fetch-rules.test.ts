import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampRecommendLimit,
  normalizeWishlistSlugLookup,
  orderProductsByWishlistSlugs,
  parseWishlistSlugsQuery,
  pickWishlistRecommendations,
} from "@/lib/wishlist-product-fetch-rules";

describe("normalizeWishlistSlugLookup", () => {
  it("dedupes and preserves first-seen order", () => {
    assert.deepEqual(
      normalizeWishlistSlugLookup(["a-b", "A-B", "c-d", "bad slug", ""]),
      ["a-b", "c-d"],
    );
  });

  it("caps at maximum", () => {
    const many = Array.from({ length: 60 }, (_, i) => `item-${i}`);
    assert.equal(normalizeWishlistSlugLookup(many).length, 50);
  });
});

describe("parseWishlistSlugsQuery", () => {
  it("returns empty for blank param", () => {
    assert.deepEqual(parseWishlistSlugsQuery(""), []);
    assert.deepEqual(parseWishlistSlugsQuery(null), []);
  });
});

describe("orderProductsByWishlistSlugs", () => {
  it("keeps wishlist slug order and skips missing", () => {
    const bySlug = new Map([
      ["b", { slug: "b", name: "B" }],
      ["a", { slug: "a", name: "A" }],
    ]);
    assert.deepEqual(
      orderProductsByWishlistSlugs(["c", "b", "a"], bySlug).map((p) => p.slug),
      ["b", "a"],
    );
  });
});

describe("clampRecommendLimit", () => {
  it("caps client limit server-side", () => {
    assert.equal(clampRecommendLimit("99"), 8);
    assert.equal(clampRecommendLimit("2"), 2);
  });
});

describe("pickWishlistRecommendations", () => {
  it("excludes wishlist slugs and duplicates", () => {
    const exclude = new Set(["a"]);
    const picked = pickWishlistRecommendations(
      [{ slug: "a" }, { slug: "b" }, { slug: "b" }, { slug: "c" }],
      exclude,
      4,
    );
    assert.deepEqual(picked.map((p) => p.slug), ["b", "c"]);
  });

  it("caps at four recommendations", () => {
    const picked = pickWishlistRecommendations(
      [
        { slug: "a" },
        { slug: "b" },
        { slug: "c" },
        { slug: "d" },
        { slug: "e" },
      ],
      new Set(),
      4,
    );
    assert.equal(picked.length, 4);
  });
});

describe("parseWishlistSlugsQuery exclude param", () => {
  it("ignores malformed exclude slugs", () => {
    assert.deepEqual(
      parseWishlistSlugsQuery("valid-slug,bad slug!,valid-2"),
      ["valid-slug", "valid-2"],
    );
  });
});