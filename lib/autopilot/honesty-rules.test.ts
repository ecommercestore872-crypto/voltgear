import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTOMATION_BLOCKS,
  FORBIDDEN_AUTOPILOT_COPY,
  catalogFacts,
  countPostexTracked,
  unitsLabel,
} from "./honesty-rules";

describe("countPostexTracked", () => {
  it("counts live orders that have a tracking number", () => {
    assert.equal(
      countPostexTracked([
        { postexTrackingNumber: "PE-1" },
        { postexTrackingNumber: "  " },
        { isDemo: true, postexTrackingNumber: "PE-DEMO" },
        { postexTrackingNumber: "PE-2" },
      ]),
      2
    );
  });
});

describe("unitsLabel", () => {
  it("says Unlimited when quantity is not set", () => {
    assert.equal(unitsLabel(null), "Unlimited");
    assert.equal(unitsLabel(undefined), "Unlimited");
    assert.equal(unitsLabel(0), "0");
    assert.equal(unitsLabel(8), "8");
  });
});

describe("catalogFacts", () => {
  it("keeps published live products and drops fake ad fields", () => {
    const rows = catalogFacts([
      { id: "a", name: "Charger", price: 1999, quantity: 3, status: "published" },
      { id: "b", name: "Draft", price: 1, quantity: 1, status: "draft" },
      { id: "c", name: "Demo", price: 1, quantity: 1, status: "published", isDemo: true },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, "Charger");
    assert.equal(rows[0]?.units, "3");
    assert.equal("roas" in rows[0]!, false);
  });
});

describe("AUTOMATION_BLOCKS", () => {
  it("states purpose and a real control without live-system language", () => {
    const blob = JSON.stringify(AUTOMATION_BLOCKS);
    for (const phrase of FORBIDDEN_AUTOPILOT_COPY) {
      assert.equal(blob.toLowerCase().includes(phrase.toLowerCase()), false, phrase);
    }
    assert.equal(AUTOMATION_BLOCKS.length, 5);
    assert.match(AUTOMATION_BLOCKS[0]!.controlHref, /\/admin\/orders/);
  });
});
