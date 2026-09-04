import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SHOPPER_BRAND } from "./brand";
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
});

describe("DEFAULT_HOME_SECTIONS", () => {
  it("starts with categories then trust, and disables lifestyle", () => {
    assert.equal(HOME_SECTION_IDS[0], "categories");
    assert.equal(HOME_SECTION_IDS[1], "trust");
    assert.equal(
      DEFAULT_HOME_SECTIONS.find((s) => s.id === "lifestyle")?.enabled,
      false
    );
    assert.equal(DEFAULT_HOME_SECTIONS[0].id, "categories");
  });
});
