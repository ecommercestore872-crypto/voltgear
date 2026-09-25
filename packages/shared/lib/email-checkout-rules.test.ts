import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkoutHttpStatusAfterOrderPersisted,
  summarizeNewOrderEmailOutcome,
} from "./email-checkout-rules";

describe("checkoutHttpStatusAfterOrderPersisted", () => {
  it("returns 200 when the order exists even if email failed", () => {
    assert.equal(checkoutHttpStatusAfterOrderPersisted(true), 200);
    assert.equal(checkoutHttpStatusAfterOrderPersisted(false), 500);
  });
});

describe("summarizeNewOrderEmailOutcome", () => {
  it("classifies partial and exception outcomes", () => {
    assert.equal(
      summarizeNewOrderEmailOutcome(
        { customerSent: true, adminSent: false, adminTo: "owner@shop.com" },
        false,
      ),
      "partial",
    );
    assert.equal(
      summarizeNewOrderEmailOutcome(
        { customerSent: false, adminSent: false, adminTo: "" },
        true,
      ),
      "exception",
    );
  });
});
