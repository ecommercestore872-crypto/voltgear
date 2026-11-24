import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isShippingFree } from "./site-config";

describe("isShippingFree", () => {
  it("is free when every item has free shipping, even under the threshold", () => {
    assert.equal(isShippingFree(500, 5000, true), true);
  });
  it("charges a mixed cart under the threshold", () => {
    assert.equal(isShippingFree(500, 5000, false), false);
  });
  it("still honours the site-wide threshold", () => {
    assert.equal(isShippingFree(5000, 5000, false), true);
    assert.equal(isShippingFree(4999, 5000, false), false);
  });
});
