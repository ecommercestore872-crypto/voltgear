import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatOrderId,
  nextSequentialNumber,
  parseSequentialOrderNumber,
} from "./order-id";

describe("formatOrderId", () => {
  it("makes a short brand number you can say on the phone", () => {
    assert.equal(formatOrderId(1001), "BNT-1001");
    assert.equal(formatOrderId(1042), "BNT-1042");
  });
});

describe("parseSequentialOrderNumber", () => {
  it("reads BNT-1042 and ignores old dated or random codes", () => {
    assert.equal(parseSequentialOrderNumber("BNT-1042"), 1042);
    assert.equal(parseSequentialOrderNumber("BNT-20260827-3771"), null);
    assert.equal(parseSequentialOrderNumber("BNT-M8K3XYZ8472"), null);
  });
});

describe("nextSequentialNumber", () => {
  it("starts at 1001 when there are no sequential numbers yet", () => {
    assert.equal(nextSequentialNumber([]), 1001);
    assert.equal(nextSequentialNumber(["BNT-20260827-3771"]), 1001);
  });

  it("continues after the highest sequential number", () => {
    assert.equal(nextSequentialNumber(["BNT-1001", "BNT-1042", "BNT-20260827-3771"]), 1043);
  });
});
