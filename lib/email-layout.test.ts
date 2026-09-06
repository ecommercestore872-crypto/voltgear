import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SHOPPER_BRAND } from "./brand";
import { applyPremiumEmailChrome, resolveEmailLogoUrl } from "./email-layout";

describe("resolveEmailLogoUrl", () => {
  it("uses the BNT seal on the shop origin when no custom logo is set", () => {
    assert.equal(
      resolveEmailLogoUrl(null, "https://buyntryy.com"),
      `https://buyntryy.com${SHOPPER_BRAND.sealSrc}`
    );
  });

  it("keeps an absolute custom logo", () => {
    assert.equal(
      resolveEmailLogoUrl("https://cdn.example/logo.png", "https://buyntryy.com"),
      "https://cdn.example/logo.png"
    );
  });
});

describe("applyPremiumEmailChrome", () => {
  it("puts the seal, gold trust line, and shop links in a table layout", () => {
    const html = applyPremiumEmailChrome({
      title: "Order confirmed",
      body: "<p>Hello</p>",
      footer: "Foot",
      brand: "Buy n Try",
      origin: "https://buyntryy.com",
    });
    assert.match(html, /bnt-seal\.png/);
    assert.match(html, /Buy n Try/);
    assert.match(html, /Cash on delivery/);
    assert.match(html, /https:\/\/buyntryy.com\/track/);
    assert.match(html, /role="presentation"/);
    assert.equal(html.includes("#0b0f19"), false);
  });
});
