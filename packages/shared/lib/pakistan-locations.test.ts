import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PAKISTAN_PROVINCES,
  getCitiesForProvince,
  normalizePakistanProvinceCode,
  pakistanProvinceLabel,
  resolvePostExListedCity,
  searchPakistanCities,
  validatePakistanDeliveryLocation,
} from "./pakistan-locations";

describe("Pakistan checkout locations", () => {
  it("covers all seven regions and major cities without suggesting delivery coverage", () => {
    assert.equal(PAKISTAN_PROVINCES.length, 7);
    const expected = [
      ["punjab", "Lahore"],
      ["sindh", "Karachi"],
      ["khyber-pakhtunkhwa", "Peshawar"],
      ["balochistan", "Quetta"],
      ["islamabad-capital-territory", "Islamabad"],
      ["azad-jammu-kashmir", "Muzaffarabad"],
      ["gilgit-baltistan", "Gilgit"],
    ] as const;
    for (const [province, city] of expected) {
      assert.ok(getCitiesForProvince(province).some((entry) => entry.name === city));
      assert.ok(getCitiesForProvince(province).every((entry) => entry.serviceability === "manual_review"));
    }
  });

  it("normalizes labels and common abbreviations", () => {
    assert.equal(normalizePakistanProvinceCode(" KPK "), "khyber-pakhtunkhwa");
    assert.equal(normalizePakistanProvinceCode("Khyber Pakhtunkhwa"), "khyber-pakhtunkhwa");
    assert.equal(normalizePakistanProvinceCode("AJK"), "azad-jammu-kashmir");
    assert.equal(normalizePakistanProvinceCode("ICT"), "islamabad-capital-territory");
    assert.equal(pakistanProvinceLabel("AJK"), "Azad Jammu & Kashmir");
    assert.equal(pakistanProvinceLabel("invalid"), null);
  });

  it("searches city names and spellings within the selected province", () => {
    assert.equal(searchPakistanCities("Punjab", "pindi")[0]?.name, "Rawalpindi");
    assert.equal(searchPakistanCities("sindh", "KHI")[0]?.name, "Karachi");
    assert.equal(searchPakistanCities("Punjab", "quetta").length, 0);
  });

  it("accepts a manually entered town for review and rejects missing or placeholder values", () => {
    const manual = validatePakistanDeliveryLocation("sindh", "  Village  Near  Hyderabad  ");
    assert.deepEqual(manual, {
      ok: true,
      provinceCode: "sindh",
      provinceLabel: "Sindh",
      city: "Village Near Hyderabad",
      serviceability: "manual_review",
    });
    assert.equal(validatePakistanDeliveryLocation("", "Lahore").ok, false);
    assert.equal(validatePakistanDeliveryLocation("punjab", "Other city / town").ok, false);
    assert.equal(validatePakistanDeliveryLocation("punjab", "\u0000Lahore").ok, false);
  });

  it("marks courier listing only when an operational-city list actually matches", () => {
    const location = validatePakistanDeliveryLocation("Punjab", "FSD", ["Faisalabad", "Lahore"]);
    assert.deepEqual(location, {
      ok: true,
      provinceCode: "punjab",
      provinceLabel: "Punjab",
      city: "Faisalabad",
      serviceability: "postex_listed",
      postExCityName: "Faisalabad",
    });
    assert.equal(resolvePostExListedCity("Pindi", ["Rawalpindi"], "Punjab"), "Rawalpindi");
    assert.equal(resolvePostExListedCity("Lahore", [], "Punjab"), null);
  });
});
