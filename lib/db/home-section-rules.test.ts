import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_HOME_SECTIONS,
  HOME_SECTION_IDS,
  enabledHomeSectionIds,
  normalizeHomeSections,
} from "./home-section-rules";

describe("normalizeHomeSections", () => {
  it("returns defaults for null/invalid", () => {
    assert.deepEqual(normalizeHomeSections(null), DEFAULT_HOME_SECTIONS);
    assert.deepEqual(normalizeHomeSections({}), DEFAULT_HOME_SECTIONS);
  });

  it("preserves order and enabled flags for known ids", () => {
    const raw = [
      { id: "blog", enabled: false },
      { id: "trust", enabled: true },
    ];
    const out = normalizeHomeSections(raw);
    assert.equal(out[0].id, "blog");
    assert.equal(out[0].enabled, false);
    assert.equal(out[1].id, "trust");
    assert.ok(out.some((s) => s.id === "bestsellers" && s.enabled === true));
    assert.equal(out.length, HOME_SECTION_IDS.length);
  });

  it("drops unknown ids and collapses duplicates (first wins)", () => {
    const out = normalizeHomeSections([
      { id: "trust", enabled: false },
      { id: "nope", enabled: true },
      { id: "trust", enabled: true },
    ]);
    assert.equal(out.filter((s) => s.id === "trust").length, 1);
    assert.equal(out.find((s) => s.id === "trust")?.enabled, false);
    assert.equal(
      out.some((s) => (s.id as string) === "nope"),
      false
    );
  });
});

describe("enabledHomeSectionIds", () => {
  it("returns only enabled ids in order", () => {
    const sections = normalizeHomeSections([
      { id: "reviews", enabled: true },
      { id: "blog", enabled: false },
      { id: "trust", enabled: true },
    ]);
    const ids = enabledHomeSectionIds(sections);
    assert.equal(ids[0], "reviews");
    assert.ok(!ids.includes("blog"));
    assert.ok(ids.includes("trust"));
  });
});
