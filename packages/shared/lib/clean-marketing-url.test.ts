import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanedPathnameAndSearch,
  stripMarketingQueryFromSearch,
} from "./clean-marketing-url";

describe("clean-marketing-url", () => {
  it("removes srsltid and keeps functional params", () => {
    const out = stripMarketingQueryFromSearch(
      "?srsltid=abc123&from=gadget",
    );
    assert.equal(out, "?from=gadget");
  });

  it("returns empty search when only marketing params", () => {
    assert.equal(stripMarketingQueryFromSearch("?gclid=x&fbclid=y"), "");
  });

  it("builds clean path", () => {
    assert.equal(
      cleanedPathnameAndSearch("/", "?srsltid=1"),
      "/",
    );
  });

  it("removes captured ad identifiers while retaining checkout routing", () => {
    assert.equal(
      cleanedPathnameAndSearch("/checkout", "?from=gadget&utm_source=ig&utm_content=charging_video_01&ad_id=987654&fbclid=FB_CLICK&ttclid=TT_CLICK"),
      "/checkout?from=gadget",
    );
  });
});
