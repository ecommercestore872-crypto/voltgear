import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { recordStorefrontSearch } from "./storefront-search";

describe("recordStorefrontSearch", () => {
  afterEach(() => {
    recordStorefrontSearch.reset();
  });

  it("rejects empty/whitespace and dedupes the same query briefly", () => {
    assert.equal(recordStorefrontSearch("  "), false);
    assert.equal(recordStorefrontSearch("earbuds"), true);
    assert.equal(recordStorefrontSearch("earbuds"), false);
    assert.equal(recordStorefrontSearch("charger"), true);
  });
});
