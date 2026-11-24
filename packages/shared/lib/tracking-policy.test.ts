import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { analyticsTrackingAllowed, advertisingTrackingAllowed, privacySignalStopsTracking, trackAllVisitors } from "./tracking-policy";
import { metaConsentAllows, canSendMetaServerEvent, hasMetaPrivacyOptOut } from "./meta-consent";
import { effectiveCheckoutTrackingConsent, metaCheckoutTrackingAllowed } from "./checkout-tracking-consent";
import { shouldLoadTikTokPixel } from "./tiktok-pixel-rules";
import { browserPrivacyOptOut } from "./cookie-consent";
import { metaPixelHeadScript } from "./meta-pixel-head-script";
import { shouldLoadClarity } from "./clarity-rules";
import { legacyConsentPolicy } from "./test-support/consent-required";

const CHOICES = [null, "essential", "analytics", "advertising", "all", "garbage"];

test("default policy: every visitor is measured, whatever they chose or their browser sends", () => {
  assert.equal(trackAllVisitors(), true);
  for (const choice of CHOICES) {
    assert.equal(analyticsTrackingAllowed(choice), true, `analytics ${choice}`);
    assert.equal(advertisingTrackingAllowed(choice), true, `advertising ${choice}`);
    assert.equal(metaConsentAllows(choice), true, `meta ${choice}`);
  }
  assert.equal(privacySignalStopsTracking(true), false);
  assert.equal(hasMetaPrivacyOptOut({ gpc: true, dnt: "1" }), false);
  assert.equal(canSendMetaServerEvent("essential", new Headers({ "sec-gpc": "1", dnt: "1" })), true);
});

test("default policy: post-order Meta, TikTok and attribution ignore Reject and privacy signals", () => {
  const request = new Request("https://buyntryy.com/api/checkout", { headers: { "sec-gpc": "1", dnt: "1" } });
  assert.equal(metaCheckoutTrackingAllowed({ request, consent: "essential" }), true);
  assert.equal(advertisingTrackingAllowed(effectiveCheckoutTrackingConsent({ request, consent: "essential" })), true);
  assert.equal(advertisingTrackingAllowed(effectiveCheckoutTrackingConsent({ request, consent: null })), true);
});

test("default policy: TikTok pixel loads for rejecters and privacy-signal browsers, but still not on dev, localhost or admin", () => {
  const base = { pixelId: "ABC123", enabled: "true", consent: null, pathname: "/", nodeEnv: "production", host: "buyntryy.com" };
  for (const consent of [null, "essential", "analytics"] as const) {
    assert.equal(shouldLoadTikTokPixel({ ...base, consent, privacyOptOut: browserPrivacyOptOut() }), true, String(consent));
  }
  assert.equal(shouldLoadTikTokPixel({ ...base, enabled: "false" }), false, "still needs the enable flag and pixel ID");
  assert.equal(shouldLoadTikTokPixel({ ...base, pixelId: "" }), false);
  assert.equal(shouldLoadTikTokPixel({ ...base, host: "localhost" }), false);
  assert.equal(shouldLoadTikTokPixel({ ...base, pathname: "/admin/orders" }), false);
});

test("default policy: Microsoft Clarity needs only its project ID and a real storefront host", () => {
  assert.equal(shouldLoadClarity({ id: "abc123", isAdmin: false, host: "buyntryy.com" }), true);
});

test("default policy: the early Meta script has no consent or privacy-signal gate; the optional policy re-adds it", () => {
  const on = metaPixelHeadScript({ pixelId: "1707417188053568", testMode: false });
  assert.doesNotMatch(on, /bnt-cookie-consent|globalPrivacyControl|doNotTrack/);
  const off = metaPixelHeadScript({ pixelId: "1707417188053568", testMode: false, requireConsent: true });
  assert.match(off, /bnt-cookie-consent/);
  assert.match(off, /globalPrivacyControl/);
  assert.doesNotThrow(() => new vm.Script(on));
  assert.doesNotThrow(() => new vm.Script(off));
});

test("optional policy (NEXT_PUBLIC_TRACK_ALL_VISITORS=false) restores 'wait for the visitor's choice'", (t) => {
  legacyConsentPolicy(t);
  assert.equal(trackAllVisitors(), false);
  assert.equal(analyticsTrackingAllowed("essential"), false);
  assert.equal(analyticsTrackingAllowed("analytics"), true);
  assert.equal(advertisingTrackingAllowed("analytics"), false);
  assert.equal(advertisingTrackingAllowed("advertising"), true);
  assert.equal(privacySignalStopsTracking(true), true);
  assert.equal(metaConsentAllows("essential"), false);
  assert.equal(metaConsentAllows(null), true);
});
