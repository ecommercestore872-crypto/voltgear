import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { acceptedMetaPurchase, metaCommerceData, metaEnvironmentAllowed, META_PRODUCTION_PIXEL_ID } from "./meta-commerce";
import { buildMetaServerPurchasePayload, trackMetaServerPurchase } from "./meta-events-api";
import { purchaseTrackOrderRef } from "./purchase-track-observability";
import { ensureMetaPageView, trackMetaViewContent, trackMetaAddToCart, trackMetaInitiateCheckout, trackAcceptedMetaPurchase } from "./meta-pixel-events";

const lines = [{ slug: "buds", name: "Earbuds", price: 2999, quantity: 2 }, { slug: "charger", name: "Charger", price: 1499, quantity: 1 }];
// Merchandise 7497 - discount 500 + shipping 250 = accepted COD value 7247.
const accepted = { ok: true, isDemo: false, orderId: "BNT-META-QA-1", total: 7247, lines };
const purchase = acceptedMetaPurchase(200, accepted)!;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

test("accepted Meta COD snapshot includes exact PKR prices, quantities, shipping/discount total", () => {
  assert.equal(purchase.value, 7247);
  const data = metaCommerceData(purchase.items, purchase.value)!;
  assert.deepEqual(data.content_ids, ["buds", "charger"]);
  assert.equal(data.num_items, 3);
  assert.equal(data.currency, "PKR");
  assert.deepEqual(data.contents, [{ id: "buds", item_price: 2999, quantity: 2 }, { id: "charger", item_price: 1499, quantity: 1 }]);
  assert.deepEqual(acceptedMetaPurchase(200, { ...accepted, replayed: true }), purchase);
  const cod = buildMetaServerPurchasePayload({ ...purchase, email: "cod.923001234567@orders.buyntryy.com", phone: "03001234567" })!;
  assert.equal(cod.data[0].user_data.em, undefined, "generated COD address is not real matching information");
  assert.deepEqual(cod.data[0].user_data.ph, [hash("923001234567")]);
});

for (const status of [400, 409, 429, 500]) test(`Meta cannot purchase on HTTP ${status}`, () => {
  assert.equal(acceptedMetaPurchase(status, accepted), null);
});

test("invalid acceptance data and invalid commerce never produce partial fallback events", () => {
  for (const data of [null, {}, { ...accepted, ok: false }, { ...accepted, isDemo: true },
    { ...accepted, orderId: " " }, { ...accepted, total: "7247" }, { ...accepted, total: null },
    { ...accepted, total: NaN }, { ...accepted, total: -1 }, { ...accepted, lines: [] }, { ...accepted, lines: [null] },
    ...[0, -1, NaN, Infinity, "2999"].map((price) => ({ ...accepted, lines: [{ ...lines[0], price }] })),
    ...[0, -1, 1.5, Infinity].map((quantity) => ({ ...accepted, lines: [{ ...lines[0], quantity }] }))]) {
    assert.equal(acceptedMetaPurchase(200, data), null);
  }
});

test("production dataset stays off previews, localhost and isolated test mode", () => {
  assert.equal(metaEnvironmentAllowed({ host: "buyntryy.com", vercelEnv: "production" }), false);
  assert.equal(metaEnvironmentAllowed({ pixelId: "", host: "buyntryy.com" }), false);
  assert.equal(metaEnvironmentAllowed({ pixelId: META_PRODUCTION_PIXEL_ID, host: "buyntryy.com", vercelEnv: "production" }), true);
  for (const host of ["localhost", "127.0.0.1", "preview.vercel.app", "voltgear-admin.vercel.app"]) {
    assert.equal(metaEnvironmentAllowed({ pixelId: META_PRODUCTION_PIXEL_ID, host }), false);
  }
  assert.equal(metaEnvironmentAllowed({ pixelId: META_PRODUCTION_PIXEL_ID, host: "buyntryy.com", vercelEnv: "preview" }), false);
  assert.equal(metaEnvironmentAllowed({ pixelId: META_PRODUCTION_PIXEL_ID, testMode: "true" }), false);
  assert.equal(metaEnvironmentAllowed({ pixelId: "999999999999999", testMode: "true", vercelEnv: "preview" }), true);
  assert.equal(metaEnvironmentAllowed({ pixelId: "999999999999999", testMode: "true", vercelEnv: "production" }), false);
  assert.equal(metaEnvironmentAllowed({ pixelId: "'malicious'", host: "buyntryy.com" }), false);
});

test("actual browser helpers enforce consent, route exclusions, payloads and persistent Purchase claims", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const beforeEnv = { ...process.env };
  const storage = new Map([["bnt-cookie-consent", "all"]]);
  const session = new Map<string, string>();
  const calls: any[][] = [];
  const browser = { fbq: (...args: any[]) => { calls.push(args); }, __META_PIXEL_BOOTSTRAPPED__: true,
    location: { pathname: "/product/buds", search: "", hostname: "buyntryy.com" },
    navigator: { locks: { request: async (_name: string, _options: unknown, callback: () => void) => callback() } },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } },
    sessionStorage: { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => { session.set(key, value); }, removeItem: (key: string) => { session.delete(key); } },
  };
  try {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = META_PRODUCTION_PIXEL_ID;
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_META_TEST_MODE;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    ensureMetaPageView("/product/buds"); ensureMetaPageView("/product/buds");
    trackMetaViewContent({ productId: "sold-out", name: "Unavailable", price: 2999, available: false });
    trackMetaViewContent({ productId: "buds", name: "Earbuds", price: 2999 });
    trackMetaViewContent({ productId: "buds", name: "Earbuds", price: 2999 });
    trackMetaAddToCart({ productId: "buds", name: "Earbuds", price: 2999, quantity: 2 });
    trackMetaAddToCart({ productId: "buds", name: "Earbuds", price: 2999, quantity: 1 });
    browser.location.pathname = "/checkout";
    trackMetaInitiateCheckout(purchase); trackMetaInitiateCheckout(purchase);
    Reflect.deleteProperty(browser, "__META_INITIATECHECKOUT_LAST_SEQUENCE__");
    trackMetaInitiateCheckout(purchase); // reload with the same checkout snapshot
    await trackAcceptedMetaPurchase(200, accepted);
    await trackAcceptedMetaPurchase(200, { ...accepted, replayed: true });
    assert.deepEqual(calls.map((args) => args[2]), ["PageView", "ViewContent", "AddToCart", "AddToCart", "PageView", "InitiateCheckout", "Purchase"]);
    assert.equal(calls[2][3].value, 5998);
    assert.deepEqual(calls.at(-1)?.[3], { ...metaCommerceData(purchase.items, purchase.value), order_id: accepted.orderId });
    const server = buildMetaServerPurchasePayload({ ...purchase, email: " QA@Example.COM ", phone: "0300 1234567", eventSourceUrl: "https://buyntryy.com/checkout?email=private" })!;
    assert.equal(calls.at(-1)?.[4].eventID, server.data[0].event_id);
    assert.deepEqual(calls.at(-1)?.[3], server.data[0].custom_data);
    assert.equal(server.data[0].event_source_url, "https://buyntryy.com/checkout");
    assert.deepEqual(server.data[0].user_data.em, [hash("qa@example.com")]);
    assert.deepEqual(server.data[0].user_data.ph, [hash("923001234567")]);
    // Simulate a fresh document retaining persistent storage.
    Reflect.deleteProperty(browser, "__META_PAGEVIEW_SEQUENCE__");
    await trackAcceptedMetaPurchase(200, accepted);
    assert.equal(calls.filter((args) => args[2] === "Purchase").length, 1);
    await trackAcceptedMetaPurchase(200, { ...accepted, orderId: "BNT-META-QA-2" });
    assert.equal(calls.filter((args) => args[2] === "Purchase").length, 2);
    const workingFbq = browser.fbq;
    browser.fbq = (...args) => { workingFbq(...args); if (args[2] === "Purchase") throw new Error("uncertain SDK result after queueing"); };
    await trackAcceptedMetaPurchase(200, { ...accepted, orderId: "UNCERTAIN-SDK" });
    await trackAcceptedMetaPurchase(200, { ...accepted, orderId: "UNCERTAIN-SDK", replayed: true });
    assert.equal(calls.filter((args) => args[2] === "Purchase").length, 3, "uncertain SDK result must not release the persistent claim");
    browser.fbq = workingFbq;
    const count = calls.length;
    storage.set("bnt-cookie-consent", "essential");
    trackMetaAddToCart({ productId: "buds", name: "Earbuds", price: 2999, quantity: 1 });
    await trackAcceptedMetaPurchase(200, { ...accepted, orderId: "DENIED" });
    storage.set("bnt-cookie-consent", "all");
    for (const path of ["/admin", "/demo/shop", "/order/BNT-1", "/api/test", "/test"]) {
      browser.location.pathname = path;
      ensureMetaPageView(path);
      trackMetaAddToCart({ productId: "buds", name: "Earbuds", price: 2999, quantity: 1 });
    }
    assert.equal(calls.length, count);
    browser.location.pathname = "/checkout";
    browser.localStorage.setItem = () => { throw new Error("restricted"); };
    await trackAcceptedMetaPurchase(200, { ...accepted, orderId: "STORAGE-DENIED" });
    assert.equal(calls.length, count);
    Reflect.deleteProperty(browser.navigator, "locks");
    await trackAcceptedMetaPurchase(200, { ...accepted, orderId: "NO-ATOMIC-LOCK" });
    assert.equal(calls.length, count);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window");
    for (const key of Object.keys(process.env)) if (!(key in beforeEnv)) delete process.env[key];
    Object.assign(process.env, beforeEnv);
  }
});

test("CAPI exact payload retries, parsing, redaction, consent and environment isolation", async () => {
  const originalFetch = globalThis.fetch;
  const beforeEnv = { ...process.env };
  const originalLog = console.info;
  const logs: unknown[][] = [];
  const calls: Array<{ url: string; init: RequestInit }> = [];
  try {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = META_PRODUCTION_PIXEL_ID;
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "PRIVATE-TOKEN-MUST-NOT-LOG";
    process.env.PURCHASE_TRACK_LOG_HMAC_KEY = "test-log-key-with-at-least-32-characters";
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_META_TEST_MODE;
    delete process.env.META_TEST_EVENT_CODE;
    delete process.env.META_GRAPH_API_VERSION;
    console.info = (...args) => { logs.push(args); };
    const input = { ...purchase, consent: "all", email: "qa@example.com", phone: "03001234567" };
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init: init! });
      return calls.length === 1 ? new Response('{"error":{"is_transient":true}}', { status: 503 }) : new Response('{"events_received":1}');
    };
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].init.body, calls[1].init.body);
    assert.match(calls[0].url, /v26\.0\/1707417188053568\/events$/);
    assert.ok(!calls[0].url.includes("PRIVATE-TOKEN"));
    assert.equal(new Headers(calls[0].init.headers).get("Authorization"), "Bearer PRIVATE-TOKEN-MUST-NOT-LOG");
    assert.match(JSON.stringify(logs), /sent/);
    const sentLog = JSON.parse(String(logs.at(-1)?.[1]));
    const expectedRef = createHmac("sha256", process.env.PURCHASE_TRACK_LOG_HMAC_KEY)
      .update("purchase-track:v1:").update(input.orderId).digest("hex").slice(0, 20);
    assert.equal(sentLog.orderRef, expectedRef);
    assert.equal(sentLog.attempts, 2);
    assert.equal(sentLog.httpStatus, 200);
    assert.ok(!JSON.stringify(sentLog).includes(input.orderId));
    calls.length = 0; logs.length = 0;
    globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init: init! }); return new Response('{"error":{"message":"PRIVATE-TOKEN-MUST-NOT-LOG qa@example.com"}}'); };
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 1);
    assert.match(JSON.stringify(logs), /failed/);
    assert.ok(!JSON.stringify(logs).includes("PRIVATE-TOKEN"));
    assert.ok(!JSON.stringify(logs).includes("qa@example.com"));
    const rejectedLog = JSON.parse(String(logs.at(-1)?.[1]));
    assert.equal(rejectedLog.orderRef, expectedRef);
    assert.equal(rejectedLog.reason, "provider_rejected");
    assert.equal(rejectedLog.attempts, 1);
    assert.equal(rejectedLog.httpStatus, 200);
    calls.length = 0;
    await trackMetaServerPurchase({ ...input, consent: "essential" });
    delete process.env.VERCEL_ENV;
    await trackMetaServerPurchase(input); // local next start must never use a copied production token
    assert.equal(calls.length, 0);
    process.env.VERCEL_ENV = "preview";
    await trackMetaServerPurchase(input);
    process.env.NEXT_PUBLIC_META_TEST_MODE = "true";
    process.env.META_TEST_EVENT_CODE = "TEST";
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 0);
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "999999999999999";
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 1);
    assert.equal(JSON.parse(String(calls[0].init.body)).test_event_code, "TEST");
    calls.length = 0;
    globalThis.fetch = async () => { calls.push({ url: "mock", init: {} }); throw new Error("PRIVATE-TOKEN"); };
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 2);
    for (const [status, text, attempts] of [
      [429, '{"error":{}}', 2], [400, '{"error":{}}', 1],
      [200, 'malformed', 1], [200, '{"events_received":0}', 1],
    ] as const) {
      calls.length = 0;
      globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), init: init! });
        return new Response(text, { status });
      };
      await trackMetaServerPurchase(input);
      assert.equal(calls.length, attempts);
      if (attempts === 2) assert.equal(calls[0].init.body, calls[1].init.body);
    }
    calls.length = 0; logs.length = 0;
    process.env.META_GRAPH_API_VERSION = "v99.0";
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 0);
    assert.equal(JSON.parse(String(logs.at(-1)?.[1])).reason, "invalid_api_version");
    delete process.env.META_GRAPH_API_VERSION;
    calls.length = 0; logs.length = 0;
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init: init! });
      if (calls.length === 1) return new Response('{"error":{"is_transient":true}}', { status: 503 });
      throw new Error("network failure");
    };
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(String(logs.at(-1)?.[1])).httpStatus, 503);
    calls.length = 0;
    delete process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
    await trackMetaServerPurchase(input);
    assert.equal(calls.length, 0);
    assert.equal(JSON.parse(String(logs.at(-1)?.[1])).reason, "missing_token");
    delete process.env.PURCHASE_TRACK_LOG_HMAC_KEY;
    delete process.env.AUTH_SECRET;
    delete process.env.ADMIN_TOKEN;
    assert.equal(purchaseTrackOrderRef("BNT-1001"), undefined);
  } finally {
    globalThis.fetch = originalFetch; console.info = originalLog;
    for (const key of Object.keys(process.env)) if (!(key in beforeEnv)) delete process.env[key];
    Object.assign(process.env, beforeEnv);
  }
});
