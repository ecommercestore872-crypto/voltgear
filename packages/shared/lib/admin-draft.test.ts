import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminDraftBag,
  asObjectRecords,
  asStringArray,
  chromeLinksField,
  draftFieldString,
} from "./admin-draft";
import { DEFAULT_NAV_LINKS } from "./chrome-nav-rules";

describe("adminDraftBag", () => {
  it("returns empty when draft is missing or not an object", () => {
    assert.deepEqual(adminDraftBag(null), {});
    assert.deepEqual(adminDraftBag({ draft: "nope" }), {});
    assert.deepEqual(adminDraftBag({ draft: ["x"] }), {});
  });

  it("returns draft object when valid", () => {
    assert.deepEqual(adminDraftBag({ draft: { brandName: "Buyntry" } }), {
      brandName: "Buyntry",
    });
  });
});

describe("asStringArray", () => {
  it("coerces only real arrays", () => {
    assert.deepEqual(asStringArray([" a ", "", 1]), ["a", "1"]);
    assert.deepEqual(asStringArray({}), []);
  });
});

describe("asObjectRecords", () => {
  it("filters non-objects", () => {
    assert.equal(asObjectRecords([{ a: 1 }, null, "x"]).length, 1);
  });
});

describe("draftFieldString", () => {
  it("prefers draft over live column", () => {
    assert.equal(
      draftFieldString({ draft: { tagline: "d" }, tagline: "live" }, "tagline", "live"),
      "d",
    );
  });
});

describe("chromeLinksField", () => {
  it("falls back when raw is not a link array", () => {
    assert.deepEqual(chromeLinksField({}, DEFAULT_NAV_LINKS), DEFAULT_NAV_LINKS);
  });
});