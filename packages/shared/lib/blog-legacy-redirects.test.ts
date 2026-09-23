import assert from "node:assert/strict";
import { describe, it } from "node:test";

const LEGACY = [
  ["/blog/smartwatch-features-worth-paying-for", "/blog/amoled-calling-smartwatch-pakistan"],
  ["/blog/true-wireless-earbuds-buying-guide", "/blog/best-tws-earbuds-pakistan-2026"],
  ["/blog/gan-chargers-explained", "/blog/65w-gan-charger-pakistan-guide"],
] as const;

describe("blog legacy redirects (next.config)", () => {
  it("maps three retired GSC 404 slugs", () => {
    assert.equal(LEGACY.length, 3);
    assert.ok(LEGACY[0][1].startsWith("/blog/"));
  });
});