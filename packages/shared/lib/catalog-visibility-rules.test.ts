import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  categoryIsStorefrontVisible,
  parseRawCategoryVisibility,
  resolveCategoryVisibility,
} from "./catalog-visibility-rules";

describe("catalog-visibility-rules: state resolution", () => {
  it("resolves unconfigured when database returns empty array or null", () => {
    assert.deepEqual(resolveCategoryVisibility([]), { status: "unconfigured" });
    assert.deepEqual(resolveCategoryVisibility(null), { status: "unconfigured" });
    assert.deepEqual(resolveCategoryVisibility(undefined), { status: "unconfigured" });
  });

  it("resolves query_failure when a query error occurs", () => {
    const error = new Error("Connection failed");
    const result = resolveCategoryVisibility(null, error);
    assert.equal(result.status, "query_failure");
    if (result.status === "query_failure") {
      assert.equal(result.error, error);
    }
  });

  it("resolves configured with zero active categories when all records are active: false", () => {
    const rows = [
      { slug: "earbuds", active: false },
      { slug: "smartwatch", active: false },
      { slug: "microphones", active: false },
    ];
    const result = resolveCategoryVisibility(rows);
    assert.equal(result.status, "configured");
    if (result.status === "configured") {
      assert.equal(result.activeSlugs.size, 0);
      assert.equal(result.allConfiguredSlugs.size, 3);
      assert.ok(result.allConfiguredSlugs.has("earbuds"));
      assert.ok(result.allConfiguredSlugs.has("smartwatch"));
      assert.ok(result.allConfiguredSlugs.has("microphones"));
    }
  });

  it("resolves configured with mixed active and inactive categories", () => {
    const rows = [
      { slug: "earbuds", active: true },
      { slug: "smartwatch", active: true },
      { slug: "microphones", active: false },
      { slug: "tripod", active: false },
    ];
    const result = resolveCategoryVisibility(rows);
    assert.equal(result.status, "configured");
    if (result.status === "configured") {
      assert.equal(result.activeSlugs.size, 2);
      assert.ok(result.activeSlugs.has("earbuds"));
      assert.ok(result.activeSlugs.has("smartwatch"));
      assert.equal(result.activeSlugs.has("microphones"), false);
      assert.equal(result.activeSlugs.has("tripod"), false);
      assert.equal(result.allConfiguredSlugs.size, 4);
    }
  });

  it("normalizes whitespace and case in slugs", () => {
    const rows = [
      { slug: "  EarBuds  ", active: true },
      { slug: "SmartWatch", active: false },
    ];
    const result = resolveCategoryVisibility(rows);
    if (result.status === "configured") {
      assert.ok(result.activeSlugs.has("earbuds"));
      assert.ok(result.allConfiguredSlugs.has("smartwatch"));
    }
  });

  it("correctly round-trips via parseRawCategoryVisibility", () => {
    const raw = {
      status: "configured" as const,
      activeSlugs: ["earbuds", "smartwatch"],
      allConfiguredSlugs: ["earbuds", "smartwatch", "microphones"],
    };
    const parsed = parseRawCategoryVisibility(raw);
    assert.equal(parsed.status, "configured");
    if (parsed.status === "configured") {
      assert.equal(parsed.activeSlugs.size, 2);
      assert.ok(parsed.activeSlugs.has("earbuds"));
      assert.ok(parsed.activeSlugs.has("smartwatch"));
      assert.equal(parsed.allConfiguredSlugs.size, 3);
    }
  });
});

describe("catalog-visibility-rules: categoryIsStorefrontVisible", () => {
  it("hides all categories when all categories are disabled (zero active)", () => {
    const state = resolveCategoryVisibility([
      { slug: "earbuds", active: false },
      { slug: "smartwatch", active: false },
    ]);
    assert.equal(categoryIsStorefrontVisible("earbuds", state), false);
    assert.equal(categoryIsStorefrontVisible("smartwatch", state), false);
    assert.equal(categoryIsStorefrontVisible("microphones", state), false);
    assert.equal(categoryIsStorefrontVisible(undefined, state), false);
  });

  it("only allows active categories in mixed configuration", () => {
    const state = resolveCategoryVisibility([
      { slug: "earbuds", active: true },
      { slug: "microphones", active: false },
    ]);
    assert.equal(categoryIsStorefrontVisible("earbuds", state), true);
    assert.equal(categoryIsStorefrontVisible("microphones", state), false);
    assert.equal(categoryIsStorefrontVisible("unknown", state), false);
    assert.equal(categoryIsStorefrontVisible(undefined, state), true);
  });

  it("fails safe on query_failure", () => {
    const state = resolveCategoryVisibility(null, new Error("Database timeout"));
    assert.equal(categoryIsStorefrontVisible("earbuds", state), false);
    assert.equal(categoryIsStorefrontVisible("microphones", state), false);
    assert.equal(categoryIsStorefrontVisible(undefined, state), false);
  });

  it("permits categories when database is unconfigured", () => {
    const state = resolveCategoryVisibility([]);
    assert.equal(categoryIsStorefrontVisible("earbuds", state), true);
    assert.equal(categoryIsStorefrontVisible(undefined, state), true);
  });

  it("supports direct Set inputs and empty Sets", () => {
    assert.equal(categoryIsStorefrontVisible("earbuds", new Set(["earbuds"])), true);
    assert.equal(categoryIsStorefrontVisible("microphones", new Set(["earbuds"])), false);
    assert.equal(categoryIsStorefrontVisible("earbuds", new Set()), false);
    assert.equal(categoryIsStorefrontVisible(undefined, new Set()), false);
    assert.equal(categoryIsStorefrontVisible("anything", null), true);
  });
});
