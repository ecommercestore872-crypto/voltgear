import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  categoryIsStorefrontVisible,
  resolveCategoryVisibility,
} from "./catalog-visibility-rules";
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

  it("excludes ALL products when all categories are disabled (zero active categories)", () => {
    // Configured categories exist in DB, but all active: false
    const state = resolveCategoryVisibility([
      { slug: "earbuds", active: false },
      { slug: "smartwatch", active: false },
      { slug: "microphones", active: false },
      { slug: "tripod", active: false },
    ]);

    const result = filterProductsForSitemap(sampleProducts, state);
    assert.deepEqual(result, []);

    // Also verify when passed an explicit empty Set
    const emptySetResult = filterProductsForSitemap(sampleProducts, new Set());
    assert.deepEqual(emptySetResult, []);
  });

  it("correctly filters mixed active and inactive categories using CategoryVisibilityResolution", () => {
    const state = resolveCategoryVisibility([
      { slug: "earbuds", active: true },
      { slug: "smartwatch", active: true },
      { slug: "microphones", active: false },
      { slug: "tripod", active: false },
    ]);

    const result = filterProductsForSitemap(sampleProducts, state);
    const slugs = result.map((p) => p.slug);
    assert.deepEqual(slugs, ["buds-pro-16", "sk-42-smartwatch"]);

    // Strictly excludes inactive categories
    assert.equal(slugs.includes("jmary-v30-pro-wireless-microphone"), false);
    assert.equal(slugs.includes("vt-200-tripod"), false);
  });

  it("fails safe and excludes all products on database/query failure", () => {
    const state = resolveCategoryVisibility(null, new Error("Supabase connection timeout"));
    const result = filterProductsForSitemap(sampleProducts, state);
    // Never leaks unverified or inactive categories during outages
    assert.deepEqual(result, []);
  });

  it("fails open and includes all valid products when unconfigured or null fallback", () => {
    const unconfiguredState = resolveCategoryVisibility([]);
    const resultFromState = filterProductsForSitemap(sampleProducts, unconfiguredState);
    assert.equal(resultFromState.length, 11);
    assert.equal(resultFromState.some((p) => p.slug.trim() === ""), false);

    const resultFromNull = filterProductsForSitemap(sampleProducts, null);
    assert.equal(resultFromNull.length, 11);
    assert.equal(resultFromNull.some((p) => p.slug.trim() === ""), false);
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

  it("maintains 100% consistency between filterProductsForSitemap and categoryIsStorefrontVisible predicate", () => {
    const scenarios = [
      resolveCategoryVisibility([
        { slug: "earbuds", active: true },
        { slug: "microphones", active: false },
      ]),
      resolveCategoryVisibility([
        { slug: "earbuds", active: false },
        { slug: "microphones", active: false },
      ]),
      resolveCategoryVisibility([]),
      resolveCategoryVisibility(null, new Error("Failed query")),
    ];

    for (const scenario of scenarios) {
      const sitemapResult = filterProductsForSitemap(sampleProducts, scenario);
      const sitemapSlugs = new Set(sitemapResult.map((p) => p.slug));

      for (const product of sampleProducts) {
        if (!product.slug || !product.slug.trim()) continue;
        const visibleOnPdp = categoryIsStorefrontVisible(product.category, scenario);
        const inSitemap = sitemapSlugs.has(product.slug);

        if (scenario.status === "configured" && scenario.activeSlugs.size === 0) {
          // When all categories are disabled, neither sitemap nor PDP exposes the product
          assert.equal(inSitemap, false);
          assert.equal(visibleOnPdp, false);
        } else if (scenario.status === "query_failure") {
          // Fail safe: neither exposes unverified categories
          assert.equal(inSitemap, false);
          assert.equal(visibleOnPdp, false);
        } else if (scenario.status === "configured") {
          // For valid products, sitemap inclusion matches PDP category visibility
          const cat = product.category ? product.category.trim().toLowerCase() : "";
          if (cat && scenario.activeSlugs.has(cat)) {
            assert.equal(inSitemap, true);
            assert.equal(visibleOnPdp, true);
          } else {
            assert.equal(inSitemap, false);
            assert.equal(visibleOnPdp, false);
          }
        }
      }
    }
  });
});
