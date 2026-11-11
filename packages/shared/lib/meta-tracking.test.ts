import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../../../apps/storefront/app/api/meta/events/route";
import { captureClickAttribution, writeMetaFbcCookie } from "./click-attribution";
import { canSendMetaServerEvent, hasMetaPrivacyOptOut } from "./meta-consent";
import { parseBrowserMetaEvent } from "./meta-event-rules";
import { buildMetaServerEventPayload, trackMetaServerPurchase } from "./meta-events-api";
import { buildMetaHashedCustomer, metaHash, normalizeMetaPhone } from "./meta-matching";
import { trackMetaAddToCart, trackMetaPurchase } from "./meta-pixel-events";

const originalFetch = global.fetch;
const originalPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const originalToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

afterEach(() => {
  global.fetch = originalFetch;
  if (originalPixelId === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  else process.env.NEXT_PUBLIC_META_PIXEL_ID = originalPixelId;
  if (originalToken === undefined) delete process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  else process.env.META_CONVERSIONS_API_ACCESS_TOKEN = originalToken;
  if (originalWindowDescriptor) Object.defineProperty(globalThis, "window", originalWindowDescriptor);
  else Reflect.deleteProperty(globalThis, "window");
  if (originalDocumentDescriptor) Object.defineProperty(globalThis, "document", originalDocumentDescriptor);
  else Reflect.deleteProperty(globalThis, "document");
});

test("Meta matching normalizes and hashes only supplied customer fields", () => {
  assert.equal(normalizeMetaPhone("0300 1234567"), "923001234567");
  assert.equal(normalizeMetaPhone("+92 300 1234567"), "923001234567");
  assert.equal(normalizeMetaPhone("not a phone"), null);
  const data = buildMetaHashedCustomer({
    email: "  SHOPPER@Example.COM ", phone: "0300 1234567", fullName: "  Ali  Khan ",
    city: " Lahore ", postalCode: " 54000 ", country: "Pakistan", externalId: " order-123 ",
  });
  assert.deepEqual(data, {
    em: metaHash("shopper@example.com"), ph: metaHash("923001234567"),
    fn: metaHash("ali"), ln: metaHash("khan"), ct: metaHash("lahore"),
    zp: metaHash("54000"), country: metaHash("pk"), external_id: metaHash("order-123"),
  });
  assert.deepEqual(buildMetaHashedCustomer({}), {});
});

test("CAPI payload shares the event ID and leaves browser signals unhashed", () => {
  const payload = buildMetaServerEventPayload({
    eventName: "Purchase", eventId: "order-123", externalId: "order-123",
    email: " Shopper@Example.com ", clientIp: "127.0.0.1", userAgent: "test-agent",
    eventSourceUrl: "http://localhost:3002/checkout", fbp: "fb.1.123.456", fbc: "fb.1.123.click",
  }, 123);
  assert.equal(payload.data[0].event_id, "order-123");
  assert.deepEqual(payload.data[0].user_data.em, [metaHash("shopper@example.com")]);
  assert.deepEqual(payload.data[0].user_data.external_id, [metaHash("order-123")]);
  assert.equal(payload.data[0].user_data.client_ip_address, "127.0.0.1");
  assert.equal(payload.data[0].user_data.client_user_agent, "test-agent");
  assert.equal(payload.data[0].user_data.fbc, "fb.1.123.click");
  assert.equal(payload.data[0].event_source_url, "http://localhost:3002/checkout");
});

test("server privacy gate rejects missing consent, GPC and DNT", () => {
  assert.equal(canSendMetaServerEvent(null, new Headers()), false);
  assert.equal(canSendMetaServerEvent("essential", new Headers()), false);
  assert.equal(canSendMetaServerEvent("all", new Headers({ "sec-gpc": "1" })), false);
  assert.equal(canSendMetaServerEvent("all", new Headers({ dnt: "1" })), false);
  assert.equal(canSendMetaServerEvent("all", new Headers()), true);
  assert.equal(hasMetaPrivacyOptOut({ gpc: true }), true);
});

test("Purchase CAPI never calls Meta without consent or after a privacy opt-out", async () => {
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "pixel-test";
  process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "test-token";
  let sends = 0;
  global.fetch = (async () => { sends++; return new Response("{}", { status: 200 }); }) as typeof fetch;
  const purchase = { orderId: "order-123", value: 100, items: [{ productId: "test", price: 100, quantity: 1 }] };
  await trackMetaServerPurchase(purchase);
  await trackMetaServerPurchase({ ...purchase, consent: "all", privacyOptOut: true });
  assert.equal(sends, 0);
});

test("relative landing URLs retain fbclid attribution", () => {
  assert.equal(captureClickAttribution("/products?fbclid=AQ_123").fbclid, "AQ_123");
});

test("fbclid creates _fbc only after browser consent", () => {
  let consent = "essential";
  const browser = { localStorage: { getItem: () => consent }, navigator: { doNotTrack: "0" }, location: { protocol: "https:", origin: "https://shop.example" } };
  const doc = { cookie: "" };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: doc });
  writeMetaFbcCookie("AQ_123");
  assert.equal(doc.cookie, "");
  consent = "all";
  writeMetaFbcCookie("AQ_123");
  assert.match(doc.cookie, /^_fbc=fb\.1\.\d+\.AQ_123; Path=\/; Max-Age=7776000; SameSite=Lax; Secure$/);
});

test("public Meta route rejects purchase and foreign page URLs", () => {
  const base = { eventName: "ViewContent", eventId: "event-123456", consent: "all",
    pageUrl: "http://localhost:3002/product/test", productIds: ["test"], value: 100 };
  assert.equal(parseBrowserMetaEvent({ ...base, eventName: "Purchase" }, "http://localhost:3002"), null);
  assert.equal(parseBrowserMetaEvent({ ...base, pageUrl: "https://attacker.example/" }, "http://localhost:3002"), null);
  assert.equal(parseBrowserMetaEvent({ ...base, productIds: ["email@example.com"] }, "http://localhost:3002"), null);
  assert.equal(parseBrowserMetaEvent(base, "http://localhost:3002")?.eventId, "event-123456");
});

test("public Meta route blocks cross-origin and GPC without a provider call", async () => {
  let sends = 0;
  global.fetch = (async () => { sends++; return new Response("{}", { status: 200 }); }) as typeof fetch;
  const body = JSON.stringify({ eventName: "PageView", eventId: "event-123456", consent: "all", pageUrl: "http://localhost:3002/" });
  const foreign = await POST(new Request("http://localhost:3002/api/meta/events", {
    method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body,
  }));
  assert.equal(foreign.status, 403);
  const optedOut = await POST(new Request("http://localhost:3002/api/meta/events", {
    method: "POST", headers: { origin: "http://localhost:3002", "sec-gpc": "1", "content-type": "application/json" }, body,
  }));
  assert.equal(optedOut.status, 204);
  assert.equal(sends, 0);
});

test("public Meta route forwards only validated event data with matching ID", async () => {
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "pixel-test";
  process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "test-token";
  type MetaPayload = ReturnType<typeof buildMetaServerEventPayload>;
  const capture: { sent: MetaPayload | null } = { sent: null };
  global.fetch = (async (_url, init) => {
    capture.sent = JSON.parse(String(init?.body));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const response = await POST(new Request("http://localhost:3002/api/meta/events", {
    method: "POST",
    headers: {
      origin: "http://localhost:3002", "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1", "user-agent": "local-test",
      cookie: "_fbp=fb.1.123.456; _fbc=fb.1.123.click",
    },
    body: JSON.stringify({ eventName: "AddToCart", eventId: "event-123456", consent: "all",
      pageUrl: "http://localhost:3002/product/test?email=private@example.com",
      productIds: ["test"], value: 100, numItems: 1 }),
  }));
  assert.equal(response.status, 204);
  const sent = capture.sent as MetaPayload | null;
  assert.equal(sent?.data?.[0]?.event_id, "event-123456");
  assert.equal(sent?.data?.[0]?.event_source_url, "http://localhost:3002/product/test");
  assert.equal(sent?.data?.[0]?.user_data?.fbp, "fb.1.123.456");
  assert.equal(sent?.data?.[0]?.user_data?.fbc, "fb.1.123.click");
  assert.equal(sent?.data?.[0]?.user_data?.client_ip_address, "127.0.0.1");
  assert.equal(sent?.data?.[0]?.user_data?.client_user_agent, "local-test");
  assert.deepEqual(sent?.data?.[0]?.custom_data?.content_ids, ["test"]);
});

test("browser event and CAPI request share ID; opt-out suppresses both", () => {
  const calls: unknown[][] = [];
  const requests: Record<string, unknown>[] = [];
  let consent = "all";
  const browser = {
    fbq: (...args: unknown[]) => calls.push(args),
    localStorage: { getItem: () => consent },
    navigator: { doNotTrack: "0", globalPrivacyControl: false },
    location: { origin: "http://localhost:3002", pathname: "/product/test" },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browser });
  global.fetch = (async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  trackMetaAddToCart({ productId: "test", name: "Test", price: 100, quantity: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "AddToCart");
  assert.equal((calls[0][3] as { eventID: string }).eventID, requests[0].eventId);
  consent = "essential";
  trackMetaAddToCart({ productId: "test", name: "Test", price: 100, quantity: 1 });
  assert.equal(calls.length, 1);
  assert.equal(requests.length, 1);
  consent = "all";
  browser.navigator.globalPrivacyControl = true;
  trackMetaAddToCart({ productId: "test", name: "Test", price: 100, quantity: 1 });
  assert.equal(calls.length, 1);
  assert.equal(requests.length, 1);
});

test("browser Purchase sends only hashed advanced matching after consent", () => {
  const calls: unknown[][] = [];
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "pixel-test";
  const browser = {
    fbq: (...args: unknown[]) => calls.push(args),
    localStorage: { getItem: () => "all" },
    sessionStorage: { getItem: () => null, setItem: () => undefined },
    navigator: { doNotTrack: "0", globalPrivacyControl: false },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browser });
  trackMetaPurchase({ orderId: "order-123", items: [{ productId: "test", price: 100, quantity: 1 }], value: 100,
    customer: { email: " Buyer@example.com ", phone: "03001234567" } });
  assert.equal(calls[0][0], "init");
  assert.equal((calls[0][2] as Record<string, string>).em, metaHash("buyer@example.com"));
  assert.equal((calls[0][2] as Record<string, string>).ph, metaHash("923001234567"));
  assert.equal((calls[0][2] as Record<string, string>).external_id, metaHash("order-123"));
  assert.equal(calls[1][1], "Purchase");
  assert.equal((calls[1][3] as { eventID: string }).eventID, "order-123");
});
