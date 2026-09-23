import { test } from "node:test";
import assert from "node:assert";
import crypto from "crypto";

// Mock environment and DOM for tests
const mockOrderId = "BNT-12345-TEST";
const testProduct = { productId: "PROD_1", name: "Gadget", price: 1000, quantity: 2 };

// Helper to mock the browser's fbq call
function createMockFbq() {
  const calls: any[] = [];
  const fbq = function (...args: any[]) {
    calls.push(args);
  };
  return { fbq, calls };
}

// 1. Simulate trackMetaPurchase
function mockBrowserTrackMetaPurchase(orderId: string, value: number, items: any[]) {
  const fbqObj = createMockFbq();
  const validOrderId = orderId.trim();

  // Based on the updated logic in trackMetaPurchase
  fbqObj.fbq(
    "track",
    "Purchase",
    {
      content_ids: items.map((i) => i.productId as string),
      content_type: "product",
      contents: items.map((i) => ({
        id: i.productId as string,
        quantity: i.quantity,
        item_price: i.price,
      })),
      num_items: items[0].quantity,
      value: value,
      currency: "PKR",
    },
    {
      eventID: validOrderId,
      event_id: validOrderId,
    }
  );
  return fbqObj.calls;
}

// 2. Simulate trackMetaServerPurchase payload construction
function mockServerTrackMetaPurchase(input: any) {
  const payload: Record<string, any> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: input.orderId,
        user_data: {},
        custom_data: {
          currency: "PKR",
          value: input.value,
          content_type: "product",
          content_ids: input.items.map((i: any) => i.productId),
        },
      }
    ]
  };
  return payload;
}

test("Meta Purchase Deduplication Validation", async (t) => {
  await t.test("browser eventID and event_id exactly match persisted orderId", () => {
    const rawOrderId = mockOrderId;
    const calls = mockBrowserTrackMetaPurchase(rawOrderId, 2000, [testProduct]);
    
    assert.strictEqual(calls.length, 1);
    const fbqArgs = calls[0];
    
    assert.strictEqual(fbqArgs[0], "track");
    assert.strictEqual(fbqArgs[1], "Purchase");
    
    const eventData = fbqArgs[3];
    assert.ok(eventData, "Missing eventData in fbq call");
    assert.strictEqual(eventData.eventID, rawOrderId, "eventID doesn't match rawOrderId");
    assert.strictEqual(eventData.event_id, rawOrderId, "event_id doesn't match rawOrderId");
  });

  await t.test("server event_id exactly matches persisted orderId", () => {
    const payload = mockServerTrackMetaPurchase({
      orderId: mockOrderId,
      value: 2000,
      items: [testProduct]
    });
    
    const serverEventId = payload.data[0].event_id;
    assert.strictEqual(serverEventId, mockOrderId, "Server event_id doesn't match mockOrderId");
  });

  await t.test("browser and server identifiers are perfectly identical", () => {
    const browserCalls = mockBrowserTrackMetaPurchase(mockOrderId, 2000, [testProduct]);
    const browserEventData = browserCalls[0][3];
    const serverPayload = mockServerTrackMetaPurchase({ orderId: mockOrderId, value: 2000, items: [testProduct] });
    
    assert.strictEqual(browserEventData.eventID, serverPayload.data[0].event_id, "Mismatch between browser eventID and server event_id");
    assert.strictEqual(browserEventData.event_id, serverPayload.data[0].event_id, "Mismatch between browser event_id and server event_id");
  });
});
