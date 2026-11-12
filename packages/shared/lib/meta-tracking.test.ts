import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { signedAdminActor, verifiedAdminActor } from "./admin-session";
import { canSendMetaServerEvent } from "./meta-consent";
import { parseBrowserMetaEvent } from "./meta-event-rules";
import { buildMetaServerPurchasePayload, trackMetaServerPurchase } from "./meta-events-api";
import { buildMetaHashedCustomer, metaHash, normalizeMetaPhone } from "./meta-matching";
import { trackMetaPurchase } from "./meta-pixel-events";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalFetch = global.fetch;
const originalEnv = {
  pixel: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  mode: process.env.NEXT_PUBLIC_META_TEST_MODE,
  enabled: process.env.NEXT_PUBLIC_META_PIXEL_ENABLED,
  code: process.env.META_TEST_EVENT_CODE,
  token: process.env.META_CONVERSIONS_API_ACCESS_TOKEN,
};
afterEach(() => {
  global.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
  for (const [key, name] of [
    ["pixel", "NEXT_PUBLIC_META_PIXEL_ID"], ["mode", "NEXT_PUBLIC_META_TEST_MODE"],
    ["enabled", "NEXT_PUBLIC_META_PIXEL_ENABLED"], ["code", "META_TEST_EVENT_CODE"],
    ["token", "META_CONVERSIONS_API_ACCESS_TOKEN"],
  ] as const) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

const purchase = { orderId: "BNT-101", value: 7247, items: [
  { productId: "buds", price: 2999, quantity: 2 },
  { productId: "charger", price: 1499, quantity: 1 },
] };

test("normalizes supplied matching fields without hashing an existing digest again", () => {
  assert.equal(normalizeMetaPhone("0300 1234567"), "923001234567");
  assert.equal(normalizeMetaPhone("+92 300 1234567"), "923001234567");
  assert.equal(normalizeMetaPhone("invalid"), null);
  assert.deepEqual(buildMetaHashedCustomer({
    email: " Buyer@Example.COM ", phone: "0300 1234567", fullName: " Ali Khan ",
    city: " Lahore ", postalCode: " 54000 ", country: "Pakistan",
  }), { em: metaHash("buyer@example.com"), ph: metaHash("923001234567"),
    fn: metaHash("ali"), ln: metaHash("khan"), ct: metaHash("lahore"),
    zp: metaHash("54000"), country: metaHash("pk") });
  assert.deepEqual(buildMetaHashedCustomer({ externalId: metaHash("already-hashed") }), {});
});

test("server Purchase uses accepted value, stable order ID, hashed PII and raw browser signals", () => {
  const body = buildMetaServerPurchasePayload({ ...purchase,
    email: " Buyer@Example.COM ", phone: "0300 1234567", fullName: " Ali Khan ",
    city: "Lahore", postalCode: "54000", country: "pk", clientIp: "127.0.0.1",
    userAgent: "test-agent", fbp: "fb.1.1234567890000.abc", fbc: "fb.1.1234567890000.click",
  })!;
  const event = body.data[0];
  assert.equal(event.event_id, purchase.orderId);
  assert.equal(event.custom_data.value, 7247);
  assert.deepEqual(event.custom_data.content_ids, ["buds", "charger"]);
  assert.deepEqual(event.user_data.em, [metaHash("buyer@example.com")]);
  assert.deepEqual(event.user_data.fn, [metaHash("ali")]);
  assert.deepEqual(event.user_data.ph, [metaHash("923001234567")]);
  assert.equal(event.user_data.client_ip_address, "127.0.0.1");
  assert.equal(event.user_data.fbc, "fb.1.1234567890000.click");
  assert.equal(event.user_data.external_id, undefined);
  assert.equal(buildMetaServerPurchasePayload({ ...purchase, items: [] }), null);
  assert.equal(buildMetaServerPurchasePayload(purchase), null, "do not invent a customer identifier");
});

test("privacy opt-outs block Meta server events before any fetch", async () => {
  assert.equal(canSendMetaServerEvent("all", new Headers({ "sec-gpc": "1" })), false);
  assert.equal(canSendMetaServerEvent("all", new Headers({ dnt: "1" })), false);
  assert.equal(canSendMetaServerEvent("all", new Headers()), true);
  assert.equal(canSendMetaServerEvent("advertising", new Headers()), true);
  assert.equal(canSendMetaServerEvent("analytics", new Headers()), false);
  let sends = 0;
  global.fetch = (async () => { sends++; return new Response("{}"); }) as typeof fetch;
  await trackMetaServerPurchase({ ...purchase, consent: "essential" });
  assert.equal(sends, 0);
});

test("pre-purchase event parser rejects Purchase and foreign origins", () => {
  const event = { eventName: "ViewContent", eventId: "event-123456", consent: "all",
    pageUrl: "https://buyntryy.com/product/buds?email=private", productIds: ["buds"], value: 2999 };
  assert.equal(parseBrowserMetaEvent({ ...event, eventName: "Purchase" }, "https://buyntryy.com"), null);
  assert.equal(parseBrowserMetaEvent({ ...event, pageUrl: "https://other.example/" }, "https://buyntryy.com"), null);
  assert.equal(parseBrowserMetaEvent(event, "https://buyntryy.com")?.pageUrl, "https://buyntryy.com/product/buds");
});

test("browser Purchase uses hashed matching and claims each order exactly once", async () => {
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789";
  process.env.NEXT_PUBLIC_META_TEST_MODE = "true";
  process.env.NEXT_PUBLIC_META_PIXEL_ENABLED = "true";
  const store = new Map<string, string>([["bnt-cookie-consent", "all"]]);
  const calls: unknown[][] = [];
  const browser = {
    fbq: (...args: unknown[]) => calls.push(args), __META_PIXEL_BOOTSTRAPPED__: true,
    localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) },
    navigator: { globalPrivacyControl: false, doNotTrack: "0", locks: { request: async (_key: string, _opts: unknown, callback: () => void) => callback() } },
    location: { pathname: "/checkout", hostname: "localhost", search: "", hash: "" },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  const customer = { email: " Buyer@Example.com ", phone: "03001234567" };
  await trackMetaPurchase({ ...purchase, customer });
  await trackMetaPurchase({ ...purchase, customer });
  await trackMetaPurchase({ ...purchase, orderId: "BNT-102", customer });
  const purchaseCalls = calls.filter((call) => call[2] === "Purchase");
  assert.deepEqual(purchaseCalls.map((call) => (call[4] as { eventID: string }).eventID), ["BNT-101", "BNT-102"]);
  const init = calls.find((call) => call[0] === "init")!;
  assert.equal((init[2] as Record<string, string>).em, metaHash("buyer@example.com"));
  assert.equal((init[2] as Record<string, string>).ph, metaHash("923001234567"));
  store.set("bnt-cookie-consent", "advertising");
  await trackMetaPurchase({ ...purchase, orderId: "BNT-103", customer });
  assert.deepEqual(calls.filter((call) => call[2] === "Purchase").map((call) => (call[4] as { eventID: string }).eventID), ["BNT-101", "BNT-102", "BNT-103"]);
  store.set("bnt-cookie-consent", "analytics");
  await trackMetaPurchase({ ...purchase, orderId: "BNT-104", customer });
  assert.equal(calls.filter((call) => call[2] === "Purchase").length, 3);
});

test("admin actor signature rejects tampering", () => {
  const id = "49998f5f-5663-4fa2-b2f9-6568a2a63cec";
  const signed = signedAdminActor(id, "local-test-secret");
  assert.equal(verifiedAdminActor(signed, "local-test-secret"), id);
  assert.equal(verifiedAdminActor(signed, "other-secret"), null);
  assert.equal(verifiedAdminActor(signed.replace(id, "49998f5f-5663-4fa2-b2f9-6568a2a63ced"), "local-test-secret"), null);
});
