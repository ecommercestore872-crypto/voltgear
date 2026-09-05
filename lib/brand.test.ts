import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SHOPPER_BRAND, shouldReplaceBrandName } from "./brand";
import {
  DEFAULT_HOME_SECTIONS,
  HOME_SECTION_IDS,
} from "./db/home-section-rules";

describe("SHOPPER_BRAND", () => {
  it("uses Buy n Try spoken name and BNT seal", () => {
    assert.equal(SHOPPER_BRAND.spokenName, "Buy n Try");
    assert.equal(SHOPPER_BRAND.seal, "BNT");
    assert.equal(SHOPPER_BRAND.tagline, "Buy it. Try it.");
    assert.equal(SHOPPER_BRAND.preferredWelcomeCode, "BNT10");
    assert.equal(SHOPPER_BRAND.fallbackStoreName, "Buy n Try");
  });

  it("replaces leftover Accessories Hub / VoltGear names with Buy n Try", () => {
    assert.equal(shouldReplaceBrandName("Accessories Hub"), true);
    assert.equal(shouldReplaceBrandName("VoltGear"), true);
    assert.equal(shouldReplaceBrandName(""), true);
    assert.equal(shouldReplaceBrandName("Buy n Try"), false);
  });
});

describe("DEFAULT_HOME_SECTIONS", () => {
  it("places lifestyle immediately above reviews, after shop categories", () => {
    assert.equal(HOME_SECTION_IDS[0], "categories");
    const lifestyleAt = HOME_SECTION_IDS.indexOf("lifestyle");
    const reviewsAt = HOME_SECTION_IDS.indexOf("reviews");
    assert.equal(lifestyleAt, reviewsAt - 1);
    assert.equal(
      DEFAULT_HOME_SECTIONS.find((s) => s.id === "lifestyle")?.enabled,
      true
    );
    assert.equal(DEFAULT_HOME_SECTIONS[lifestyleAt].id, "lifestyle");
  });
});
