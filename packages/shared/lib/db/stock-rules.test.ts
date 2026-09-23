import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decideStockAction,
  nextStockStatus,
  parseOptionalQuantity,
  syncStockStatusWithQuantity,
} from "./stock-rules";

describe("decideStockAction", () => {
  it("treats null quantity as unlimited", () => {
    assert.equal(decideStockAction(null, 2), "unlimited");
  });

  it("blocks when configured units are too low", () => {
    assert.equal(decideStockAction(1, 2), "insufficient");
  });

  it("decrements when enough units exist", () => {
    assert.equal(decideStockAction(5, 2), "decrement");
  });
});

describe("nextStockStatus", () => {
  it("marks zero remaining as out of stock", () => {
    assert.equal(nextStockStatus(0), "out-of-stock");
  });
});

describe("parseOptionalQuantity", () => {
  it("treats empty as unlimited", () => {
    const r = parseOptionalQuantity("");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.quantity, null);
  });
});

describe("syncStockStatusWithQuantity", () => {
  it("forces out of stock when units are zero", () => {
    assert.equal(syncStockStatusWithQuantity("in-stock", 0), "out-of-stock");
  });
});
