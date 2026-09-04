import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_AUTOPILOT_SETTINGS } from "./settings";

describe("DEFAULT_AUTOPILOT_SETTINGS", () => {
  it("starts offline so live sales are not told Autopilot is running", () => {
    assert.equal(DEFAULT_AUTOPILOT_SETTINGS.masterEnabled, false);
    assert.equal(DEFAULT_AUTOPILOT_SETTINGS.orderDispatchMode, "DISABLED");
    assert.equal(DEFAULT_AUTOPILOT_SETTINGS.deliveryRescueMode, "DISABLED");
    assert.equal(DEFAULT_AUTOPILOT_SETTINGS.settlementReconciliationMode, "DISABLED");
    assert.equal(DEFAULT_AUTOPILOT_SETTINGS.inventoryReorderMode, "DISABLED");
  });
});
