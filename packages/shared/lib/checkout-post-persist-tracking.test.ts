import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveCheckoutTrackingConsent } from "./checkout-tracking-consent";

test("GPC and DNT override stored marketing consent for all post-order tracking", () => {
  const request = (headers: Record<string, string>) => new Request("https://buyntryy.com/api/checkout", { headers });
  assert.equal(effectiveCheckoutTrackingConsent({ request: request({ "sec-gpc": "1" }), consent: "all" }), "essential");
  assert.equal(effectiveCheckoutTrackingConsent({ request: request({ dnt: "1" }), consent: "all" }), "essential");
  assert.equal(effectiveCheckoutTrackingConsent({ request: request({}), consent: "all" }), "all");
  assert.equal(effectiveCheckoutTrackingConsent({ request: request({}), consent: "advertising" }), "advertising");
  assert.equal(effectiveCheckoutTrackingConsent({ request: request({ "sec-gpc": "1" }), consent: "advertising" }), "essential");
  assert.equal(effectiveCheckoutTrackingConsent({ request: request({}), consent: null }), "essential");
});
