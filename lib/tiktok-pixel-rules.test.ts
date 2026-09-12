import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  shouldLoadTikTokPixel,
  tiktokPixelBootstrapSource,
} from "./tiktok-pixel-rules";

describe("shouldLoadTikTokPixel", () => {
  const base = {
    pixelId: "DAF1KQBC77UES974M180",
    enabled: "true",
    consent: "all" as const,
    pathname: "/",
    nodeEnv: "production",
    host: "buyntryy.com",
  };

  it("loads on the live storefront with consent and flags set", () => {
    assert.equal(shouldLoadTikTokPixel(base), true);
  });

  it("stays off without id, without enable flag, without advertising consent, in development, on localhost, or on admin", () => {
    assert.equal(shouldLoadTikTokPixel({ ...base, pixelId: "" }), false);
    assert.equal(shouldLoadTikTokPixel({ ...base, enabled: "false" }), false);
    assert.equal(shouldLoadTikTokPixel({ ...base, nodeEnv: "development" }), false);
    assert.equal(shouldLoadTikTokPixel({ ...base, host: "localhost" }), false);
    assert.equal(shouldLoadTikTokPixel({ ...base, pathname: "/admin/orders" }), false);
    assert.equal(shouldLoadTikTokPixel({ ...base, pathname: "/studio" }), false);
  });
});

describe("tiktokPixelBootstrapSource", () => {
  it("keeps official consent methods and a single load + page call", () => {
    const src = tiktokPixelBootstrapSource("DAF1KQBC77UES974M180");
    assert.match(src, /holdConsent/);
    assert.match(src, /grantConsent/);
    assert.match(src, /revokeConsent/);
    assert.match(src, /ttq\.load\("DAF1KQBC77UES974M180"\)/);
    assert.match(src, /ttq\.page\(\)/);
    assert.equal((src.match(/ttq\.load\(/g) || []).length, 1);
    assert.equal((src.match(/ttq\.page\(\)/g) || []).length, 1);
    assert.doesNotMatch(src, /ViewContent|AddToCart|InitiateCheckout|Purchase/);
  });
});
