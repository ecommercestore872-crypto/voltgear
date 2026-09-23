import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isProductImageTooSmall, PRODUCT_IMAGE } from "./product-image";

describe("isProductImageTooSmall", () => {
  it("flags photos under 800 on the short edge", () => {
    assert.equal(isProductImageTooSmall(640, 640), true);
    assert.equal(isProductImageTooSmall(1200, 600), true);
  });

  it("accepts square 2048 photos and other sharp sizes", () => {
    assert.equal(isProductImageTooSmall(PRODUCT_IMAGE.uploadWidth, PRODUCT_IMAGE.uploadHeight), false);
    assert.equal(isProductImageTooSmall(800, 800), false);
    assert.equal(isProductImageTooSmall(2000, 1500), false);
  });

  it("does not warn when size is unknown", () => {
    assert.equal(isProductImageTooSmall(), false);
    assert.equal(isProductImageTooSmall(0, 0), false);
  });
});
