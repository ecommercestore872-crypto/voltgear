import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  citiesForRegion,
  resolveCheckoutLocation,
} from "./pakistan-locations";

describe("pakistan-locations", () => {
  it("filters cities by province", () => {
    const punjab = citiesForRegion("PB");
    assert.ok(punjab.some((c) => c.id === "lahore"));
    assert.ok(!punjab.some((c) => c.id === "karachi"));
  });

  it("resolves serviceable province+city", () => {
    const r = resolveCheckoutLocation({ province: "PB", cityId: "lahore" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.cityLabel, "Lahore");
    assert.equal(r.courierServiceable, true);
  });

  it("rejects city/province mismatch", () => {
    const r = resolveCheckoutLocation({ province: "SD", cityId: "lahore" });
    assert.equal(r.ok, false);
  });

  it("rejects missing province", () => {
    const r = resolveCheckoutLocation({ city: "Lahore" });
    assert.equal(r.ok, false);
  });
});
