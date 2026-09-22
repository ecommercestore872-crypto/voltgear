import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeSettingsSocialLinks } from "./settings-social";

describe("normalizeSettingsSocialLinks", () => {
  it("reads platform urls from legacy object shape", () => {
    const links = normalizeSettingsSocialLinks({
      instagram: "https://instagram.com/x",
      tiktok: "",
    });
    assert.deepEqual(links, [
      { platform: "instagram", url: "https://instagram.com/x" },
    ]);
  });

  it("returns empty for non-array non-object values", () => {
    assert.deepEqual(normalizeSettingsSocialLinks("bad"), []);
    assert.deepEqual(normalizeSettingsSocialLinks(null), []);
  });

  it("passes through array entries", () => {
    const links = normalizeSettingsSocialLinks([
      { platform: "facebook", url: "https://facebook.com/p" },
    ]);
    assert.equal(links[0]?.url, "https://facebook.com/p");
  });
});