import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, describe, it } from "node:test";

import { buildTikTokServerPurchasePayload, trackTikTokServerPurchase } from "./tiktok-events-api";

const originalFetch = global.fetch;
const originalEnv = {
  pixel: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
  token: process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN,
  enabled: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED,
};

afterEach(() => {
  global.fetch = originalFetch;
  if (originalEnv.pixel === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = originalEnv.pixel;
  if (originalEnv.token === undefined) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = originalEnv.token;
  if (originalEnv.enabled === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;
  else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = originalEnv.enabled;
});

const input = {
  orderId: "BNT-101",
  total: 6200,
  consent: "all",
  email: " ALICE@Example.com ",
  phone: "0300 1234567",
  ip: "203.0.113.9",
  userAgent: "test browser",
  ttclid: "click-123",
  ttp: "cookie-123",
  url: "https://buyntryy.com/checkout",
  lines: [{ slug: "buds", variantKey: "black", name: "Buds", quantity: 2, price: 3000 }],
};

describe("TikTok Events API 2.0 Purchase", () => {
  it("uses current web schema, normalized matching data, and browser event ID", () => {
    const payload = buildTikTokServerPurchasePayload(input, "PIXEL", 1700000000);
    assert.ok(payload);
    assert.equal(payload.event_source, "web");
    assert.equal(payload.event_source_id, "PIXEL");
    assert.equal(payload.data[0].event, "Purchase");
    assert.equal(payload.data[0].event_time, 1700000000);
    assert.equal(payload.data[0].event_id, "purchase_BNT-101");
    assert.equal(payload.data[0].user.ttclid, "click-123");
    assert.equal(payload.data[0].user.ttp, "cookie-123");
    assert.equal(payload.data[0].user.email, createHash("sha256").update("alice@example.com").digest("hex"));
    assert.equal(payload.data[0].user.phone, createHash("sha256").update("+923001234567").digest("hex"));
    assert.equal(payload.data[0].page.url, "https://buyntryy.com/checkout");
    assert.equal(payload.data[0].properties.currency, "PKR");
    assert.equal(payload.data[0].properties.value, 6200);
    assert.deepEqual(payload.data[0].properties.contents[0], {
      content_id: "buds::black", content_name: "Buds", quantity: 2, price: 3000,
    });
  });

  it("sends one request to the Events API 2.0 endpoint after consent", async () => {
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
    process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "TEST_TOKEN";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
    let url = "";
    let payload: unknown;
    global.fetch = async (target, init) => {
      url = String(target);
      payload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ code: 0, message: "OK" }), { status: 200 });
    };
    await trackTikTokServerPurchase(input);
    assert.equal(url, "https://business-api.tiktok.com/open_api/v1.3/event/track/");
    assert.deepEqual(payload, buildTikTokServerPurchasePayload(input, "PIXEL", (payload as { data: Array<{event_time: number}> }).data[0].event_time));
  });

  it("does not send without advertising consent or a valid order", async () => {
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
    process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "TEST_TOKEN";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
    let calls = 0;
    global.fetch = async () => { calls++; return new Response("{}"); };
    await trackTikTokServerPurchase({ ...input, consent: "essential" });
    await trackTikTokServerPurchase({ ...input, lines: [] });
    assert.equal(calls, 0);
  });
});
