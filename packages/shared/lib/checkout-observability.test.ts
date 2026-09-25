import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CHECKOUT_P95_ALERT_MS,
  CHECKOUT_P95_TARGET_MS,
  checkoutSloLog,
} from "./checkout-observability";

describe("checkout SLO constants", () => {
  it("uses 3s target and 4s alert threshold", () => {
    assert.equal(CHECKOUT_P95_TARGET_MS, 3000);
    assert.equal(CHECKOUT_P95_ALERT_MS, 4000);
  });
});

describe("checkoutSloLog", () => {
  it("emits JSON without throwing", () => {
    const prev = console.info;
    let line = "";
    console.info = (...args: unknown[]) => {
      line = String(args[1] ?? args[0]);
    };
    try {
      checkoutSloLog({
        outcome: "success",
        status: 200,
        durationMs: 842,
        itemCount: 2,
      });
      const parsed = JSON.parse(line) as Record<string, unknown>;
      assert.equal(parsed.outcome, "success");
      assert.equal(parsed.status, 200);
      assert.equal(parsed.durationMs, 842);
      assert.ok(typeof parsed.ts === "string");
      assert.ok(!("email" in parsed));
    } finally {
      console.info = prev;
    }
  });
});
