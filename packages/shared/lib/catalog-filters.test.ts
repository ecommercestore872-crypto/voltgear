import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCatalogFilters } from "./catalog-rules";
import { categoryIsStorefrontVisible } from "./catalog-visibility-rules";

describe("catalog request boundaries", () => {
  it("bounds untrusted pagination and prices", () => {
    const filters = parseCatalogFilters({ page: "999999999", minPrice: "999999999999" });
    assert.equal(filters.page, 10_000);
    assert.equal(filters.minPrice, 1_000_000_000);
  });

  it("does not expose a disabled category through a direct filter", () => {
    const active = new Set(["chargers", "earbuds"]);
    assert.equal(categoryIsStorefrontVisible("chargers", active), true);
    assert.equal(categoryIsStorefrontVisible("hidden-stock", active), false);
    assert.equal(categoryIsStorefrontVisible("anything", null), true);
  });
});
