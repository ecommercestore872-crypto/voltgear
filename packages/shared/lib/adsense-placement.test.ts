import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allowsAdsenseDisplayAds } from "./adsense-placement";

describe("allowsAdsenseDisplayAds", () => {
  it("allows only individual blog guides", () => {
    assert.equal(allowsAdsenseDisplayAds("/blog/how-cash-on-delivery-works-buy-n-try"), true);
    assert.equal(allowsAdsenseDisplayAds("/blog/how-cash-on-delivery-works-buy-n-try/"), true);
  });

  it("blocks the shop, checkout, and blog index", () => {
    for (const path of [
      "/",
      "/products",
      "/product/studio-max",
      "/cart",
      "/checkout",
      "/track",
      "/contact",
      "/blog",
      "/wishlist",
    ]) {
      assert.equal(allowsAdsenseDisplayAds(path), false, path);
    }
  });
});
