import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePushEndpoint, parsePushSubscription, urlBase64ToUint8Array } from "./admin-push-rules";

describe("parsePushSubscription", () => {
  const ok = { endpoint: "https://push.example.com/abc", keys: { p256dh: "key", auth: "auth" } };

  it("accepts a valid subscription", () => {
    assert.deepEqual(parsePushSubscription(ok), { endpoint: ok.endpoint, p256dh: "key", auth: "auth" });
  });

  it("rejects bad input", () => {
    assert.equal(parsePushSubscription(null), null);
    assert.equal(parsePushSubscription({ ...ok, endpoint: "http://push.example.com/abc" }), null);
    assert.equal(parsePushSubscription({ ...ok, keys: { p256dh: "", auth: "auth" } }), null);
    assert.equal(parsePushSubscription({ ...ok, keys: { p256dh: "key" } }), null);
    assert.equal(parsePushSubscription({ ...ok, endpoint: "https://x/" + "a".repeat(2100) }), null);
  });
});

describe("parsePushEndpoint", () => {
  it("needs a non-empty string", () => {
    assert.equal(parsePushEndpoint({ endpoint: "https://a/b" }), "https://a/b");
    assert.equal(parsePushEndpoint({ endpoint: 5 }), null);
    assert.equal(parsePushEndpoint(undefined), null);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes url-safe base64 without padding", () => {
    assert.deepEqual(Array.from(urlBase64ToUint8Array("-_8")), [251, 255]);
    assert.deepEqual(Array.from(urlBase64ToUint8Array("AQID")), [1, 2, 3]);
  });
});
