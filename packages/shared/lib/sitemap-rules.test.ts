import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterProductsForSitemap } from "./sitemap-rules";

describe("filterProductsForSitemap", () => {
  const sampleProducts = [
    { slug: "buds-pro-16", category: "earbuds", _updatedAt: "2026-10-20" },
    { slug: "sk-42-smartwatch", category: "smartwatch", _updatedAt: "2026-10-21" },
    { slug: "pb-50-power-bank", category: "power-bank", _updatedAt: "2026-10-22" },
    { slug: "airpods-case", category: "accessories", _updatedAt: "2026-10-23" },
    // Products in inactive categories:
    { slug: "jmary-v30-pro-wireless-microphone", category: "microphones", _updatedAt: "2026-10-18" },
    { slug: "vt-200-tripod", category: "tripod", _updatedAt: "2026-10-17" },
    { slug: "live-p24-ring-light", category: "ring-light", _updatedAt: "2026-10-16" },
    { slug: "k6-selfie-stick", category: "selfie-stick", _updatedAt: "2026-10-15" },
    { slug: "samsung-25w-charger", category: "charger", _updatedAt: "2026-10-14" },
    // Malformed / edge products:
    { slug: "no-category-product", category: null, _updatedAt: "2026-10-10" },
    { slug: "blank-category-product", category: "   ", _updatedAt: "2026-10-09" },
    { slug: "   ", category: "earbuds" },
  ];

  it("filters out products belonging to inactive categories when active set is defined", () => {
    const activeCategories = new Set(["earbuds", "smartwatch", "power-bank", "accessories"]);
    const result = filterProductsForSitemap(sampleProducts, activeCategories);

    const slugs = result.map((p) => p.slug);
    assert.deepEqual(slugs, [
      "buds-pro-16",
      "sk-42-smartwatch",
      "pb-50-power-bank",
      "airpods-case",
    ]);

    // Ensure inactive categories are strictly excluded
    assert.equal(slugs.includes("jmary-v30-pro-wireless-microphone"), false);
    assert.equal(slugs.includes("vt-200-tripod"), false);
    assert.equal(slugs.includes("live-p24-ring-light"), false);
    assert.equal(slugs.includes("k6-selfie-stick"), false);
    assert.equal(slugs.includes("samsung-25w-charger"), false);
    assert.equal(slugs.includes("no-category-product"), false);
  });

  it("fails open and includes all valid products when activeCategorySlugs is null (fallback mode)", () => {
    const result = filterProductsForSitemap(sampleProducts, null);
    // Should include all products that have non-empty slugs
    assert.equal(result.length, 11);
    assert.equal(result.some((p) => p.slug.trim() === ""), false);
  });

  it("handles whitespace in categories cleanly", () => {
    const activeCategories = new Set(["earbuds"]);
    const products = [
      { slug: "p1", category: " earbuds " },
      { slug: "p2", category: "earbuds" },
      { slug: "p3", category: "other" },
    ];
    const result = filterProductsForSitemap(products, activeCategories);
    assert.deepEqual(result.map((p) => p.slug), ["p1", "p2"]);
  });

  it("returns empty array when given empty inputs or non-arrays", () => {
    assert.deepEqual(filterProductsForSitemap([], new Set(["earbuds"])), []);
    assert.deepEqual(filterProductsForSitemap(null as unknown as [], new Set(["earbuds"])), []);
  });
});
