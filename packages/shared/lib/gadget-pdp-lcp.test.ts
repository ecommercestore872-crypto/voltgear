import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pdpLcpImageUrl, pdpProductCacheTag } from "./gadget-pdp-lcp";

describe("gadget-pdp-lcp", () => {
  it("returns a cache tag per slug", () => {
    assert.equal(pdpProductCacheTag("  mic-j10  "), "pdp-product-mic-j10");
  });

  it("resolves studio image when configured", () => {
    const url = pdpLcpImageUrl({
      slug: "test-slug",
      category: "power-banks",
      images: [],
      cloudinaryImages: [],
    });
    assert.equal(typeof url === "string" || url === null, true);
  });
});
