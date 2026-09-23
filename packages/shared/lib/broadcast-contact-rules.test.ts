import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizePhone } from "./messaging";
import {
  idsMatchingNormalizedPhone,
  phonesMatchingNormalized,
  planManualAdd,
  suppressedPhoneSet,
} from "./broadcast-contact-rules";

const TARGET = "+923295577815";

describe("idsMatchingNormalizedPhone", () => {
  it("matches stored numbers even when the format differs from E.164", () => {
    const ids = idsMatchingNormalizedPhone(
      [
        { id: "a", phone: "03295577815" },
        { id: "b", phone: "+92 329 5577815" },
        { id: "c", phone: "+923001234567" },
      ],
      TARGET
    );
    assert.deepEqual(ids.sort(), ["a", "b"]);
  });
});

describe("phonesMatchingNormalized", () => {
  it("returns every stored format of the same number", () => {
    assert.deepEqual(
      phonesMatchingNormalized(["03295577815", "+923295577815", "+923001111111"], TARGET).sort(),
      ["+923295577815", "03295577815"]
    );
  });
});

describe("suppressedPhoneSet", () => {
  it("treats unnormalized suppressed numbers as the same phone", () => {
    const set = suppressedPhoneSet(["03295577815", "not-a-phone"]);
    assert.equal(set.has(TARGET), true);
    assert.equal(set.has("+923001234567"), false);
  });
});

describe("planManualAdd", () => {
  it("updates an existing manual row instead of rejecting as a duplicate", () => {
    const phone = normalizePhone("03295577815");
    assert.equal(phone, TARGET);
    const plan = planManualAdd({
      phone,
      visibleContacts: [{ phone: TARGET, source: "manual" }],
      manualRows: [{ id: "manual-1", phone: "03295577815" }],
    });
    assert.deepEqual(plan, { action: "update", ids: ["manual-1"] });
  });

  it("still rejects when the number comes from an order", () => {
    const plan = planManualAdd({
      phone: TARGET,
      visibleContacts: [{ phone: TARGET, source: "order" }],
      manualRows: [],
    });
    assert.equal(plan.action, "reject");
  });

  it("inserts when the number is new", () => {
    const plan = planManualAdd({
      phone: TARGET,
      visibleContacts: [],
      manualRows: [],
    });
    assert.equal(plan.action, "insert");
  });
});
