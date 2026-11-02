import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptedTikTokPurchase, trackAcceptedTikTokPurchase } from "./tiktok-checkout-result";
import { buildTikTokServerPurchasePayload } from "./tiktok-events-api";
import { purchaseEventId } from "./tiktok-browser-events";

const accepted = {
  ok: true, orderId: "BNT-ACCEPTED", total: 6200,
  lines: [{ slug: "buds", sku: "BUDS", variantSku: "BUDS-BLK", name: "Buds", quantity: 2, price: 3000 }],
};

for (const status of [400, 409, 429, 500]) {
  test(`HTTP ${status} cannot produce Purchase even if the body contains order data`, () => {
    assert.equal(acceptedTikTokPurchase(status, accepted), null);
    assert.equal(trackAcceptedTikTokPurchase(status, accepted), null);
  });
}

test("requires actual acceptance, persisted order ID, authoritative numeric total and valid lines", () => {
  for (const data of [null, {}, { ...accepted, ok: false }, { ...accepted, isDemo: true }, { ...accepted, orderId: "" },
    { ...accepted, total: null }, { ...accepted, total: "6200" }, { ...accepted, lines: [] },
    { ...accepted, lines: [null] }, { ...accepted, lines: [{ quantity: 1 }] }]) {
    assert.equal(acceptedTikTokPurchase(200, data), null);
  }
});

test("accepted COD order and replay use the persisted snapshot and identical channel IDs", () => {
  const purchase = acceptedTikTokPurchase(200, accepted)!;
  assert.deepEqual(purchase, { orderId: accepted.orderId, total: 6200, lines: accepted.lines });
  assert.deepEqual(acceptedTikTokPurchase(200, { ...accepted, replayed: true }), purchase);
  const server = buildTikTokServerPurchasePayload(purchase, "PIXEL", 1700000000)!;
  assert.equal(server.data[0].event_id, purchaseEventId(purchase.orderId));
  assert.equal(server.data[0].properties.contents[0].content_id, "BUDS-BLK");
  assert.equal(server.data[0].properties.contents[0].quantity, 2);
  assert.equal(server.data[0].properties.value, 6200);
  assert.equal(server.data[0].properties.currency, "PKR");
});

test("browser retries release pending state, recheck consent and deduplicate with unavailable persistent storage", () => {
  const descriptors = ["window", "localStorage", "sessionStorage"].map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  const keys = ["NODE_ENV", "NEXT_PUBLIC_TIKTOK_PIXEL_ID", "NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED"];
  const env = keys.map((key) => process.env[key]);
  let consent = "essential";
  let tick: () => void = () => {};
  const sent: string[] = [];
  const browser: { ttq?: { track: (...args: any[]) => void } } & Record<string, unknown> = {
    location: { hostname: "buyntryy.com", pathname: "/checkout" },
    localStorage: { getItem: () => consent },
    setInterval: (callback: () => void) => { tick = callback; return 1; },
    clearInterval() {},
  };
  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
    Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browser });
    for (const key of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(globalThis, key, { configurable: true, get: () => { throw new Error("Storage blocked"); } });
    }
    const order = { ...accepted, orderId: "QA-BROWSER-RECOVERY" };
    assert.equal(trackAcceptedTikTokPurchase(200, order), null);
    consent = "all";
    assert.equal(trackAcceptedTikTokPurchase(200, order), "purchase_QA-BROWSER-RECOVERY");
    assert.equal(trackAcceptedTikTokPurchase(200, order), null);
    consent = "essential";
    tick();
    assert.equal(sent.length, 0);
    consent = "all";
    assert.equal(trackAcceptedTikTokPurchase(200, order), "purchase_QA-BROWSER-RECOVERY");
    for (let index = 0; index < 50; index++) tick();
    browser.ttq = { track: () => { throw new Error("SDK failure"); } };
    assert.equal(trackAcceptedTikTokPurchase(200, order), null);
    browser.ttq.track = (_event, _properties, options) => sent.push(options.event_id);
    assert.equal(trackAcceptedTikTokPurchase(200, { ...order, replayed: true }), "purchase_QA-BROWSER-RECOVERY");
    assert.equal(trackAcceptedTikTokPurchase(200, order), null);
    assert.equal(trackAcceptedTikTokPurchase(200, { ...order, orderId: "QA-BROWSER-DISTINCT" }), "purchase_QA-BROWSER-DISTINCT");
    assert.deepEqual(sent, ["purchase_QA-BROWSER-RECOVERY", "purchase_QA-BROWSER-DISTINCT"]);
  } finally {
    ["window", "localStorage", "sessionStorage"].forEach((key, index) => {
      if (descriptors[index]) Object.defineProperty(globalThis, key, descriptors[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
    keys.forEach((key, index) => { if (env[index] === undefined) delete process.env[key]; else process.env[key] = env[index]; });
  }
});
