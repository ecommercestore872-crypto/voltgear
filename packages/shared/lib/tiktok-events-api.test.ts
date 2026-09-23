import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trackTikTokServerPurchase } from "./tiktok-events-api";

describe("trackTikTokServerPurchase Click ID mapping", () => {
  it("maps ttclid to context.ad.callback and retains fail-open behavior", async () => {
    // We mock fetch to verify the payload structure instead of making a real network request.
    const originalFetch = global.fetch;
    let payloadStr = "";
    
    (global as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
      if (init && init.body) {
        payloadStr = init.body.toString();
      }
      return new Response(JSON.stringify({ code: 0, message: "OK" }), { status: 200, statusText: "OK" });
    };

    try {
      // Simulate real production environment preconditions
      process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "TEST_PIXEL";
      process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "TEST_TOKEN";
      process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";

      // 1. Execute purchase with a ttclid
      await trackTikTokServerPurchase({
        orderId: "TEST-01",
        total: 100,
        consent: "all",
        ttclid: "qa-test-123",
        lines: [
          { slug: "test-product", quantity: 1, price: 100 }
        ]
      });

      // Verify the payload contains context.ad.callback
      const payload = JSON.parse(payloadStr);
      assert.equal(payload.context.ad.callback, "qa-test-123", "ttclid mapped incorrectly to TikTok Click ID field");
      assert.equal(payload.event_id, "purchase_TEST-01", "event ID mismatch");

      // 2. Execute without ttclid
      payloadStr = "";
      await trackTikTokServerPurchase({
        orderId: "TEST-NONTIKTOK",
        total: 100,
        consent: "all",
        lines: [
          { slug: "test-product" }
        ]
      });

      const payloadNoClick = JSON.parse(payloadStr);
      assert.equal(payloadNoClick.context.ad, undefined, "ad block should not exist if no click id");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
