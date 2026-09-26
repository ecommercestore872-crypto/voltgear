import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_SHOP_API_SLOW_MS,
  shopApiSlowThresholdMs,
} from "./shop-api-observability";

describe("shop-api-observability", () => {
  it("uses default slow threshold", () => {
    const prev = process.env.SHOP_API_SLOW_MS;
    delete process.env.SHOP_API_SLOW_MS;
    assert.equal(shopApiSlowThresholdMs(), DEFAULT_SHOP_API_SLOW_MS);
    if (prev !== undefined) process.env.SHOP_API_SLOW_MS = prev;
  });
});
