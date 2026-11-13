import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allowsAdvertising,
  allowsAnalytics,
  consentFromPreferences,
  optionalConsentRevoked,
  parseConsentMetric,
  parseCookieConsent,
} from "./cookie-consent";

test("legacy and separate optional choices preserve independent gates", () => {
  assert.deepEqual([false, true, false, true].map((analytics, i) =>
    consentFromPreferences(analytics, [false, false, true, true][i])),
  ["essential", "analytics", "advertising", "all"]);
  assert.equal(allowsAnalytics("analytics"), true);
  assert.equal(allowsAdvertising("analytics"), false);
  assert.equal(allowsAnalytics("advertising"), false);
  assert.equal(allowsAdvertising("advertising"), true);
  assert.equal(allowsAnalytics("all"), true);
  assert.equal(allowsAdvertising("all"), true);
  assert.equal(parseCookieConsent("essential"), "essential");
  assert.equal(parseCookieConsent("unrecognized"), null);
  assert.deepEqual(parseConsentMetric({ event: "saved", choice: "advertising" }), { event: "saved", choice: "advertising" });
  assert.equal(parseConsentMetric({ event: "saved", choice: "all", email: "private" }), null);
  assert.equal(parseConsentMetric({ event: "saved", choice: "invalid" }), null);
});

test("revoking either optional purpose requires unloading already loaded SDKs", () => {
  assert.equal(optionalConsentRevoked("all", "analytics"), true);
  assert.equal(optionalConsentRevoked("all", "advertising"), true);
  assert.equal(optionalConsentRevoked("advertising", "essential"), true);
  assert.equal(optionalConsentRevoked("analytics", null), true);
  assert.equal(optionalConsentRevoked("essential", "analytics"), false);
  assert.equal(optionalConsentRevoked("analytics", "all"), false);
});
