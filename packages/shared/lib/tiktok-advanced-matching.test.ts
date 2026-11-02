import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { identifyTikTokCustomer, type TikTokCustomer } from "./tiktok-browser-events";
import { trackAcceptedTikTokPurchase } from "./tiktok-checkout-result";
import { buildTikTokServerPurchasePayload } from "./tiktok-events-api";

describe("TikTok Advanced Matching before accepted Purchase", () => {
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const envKeys = ["NODE_ENV", "NEXT_PUBLIC_TIKTOK_PIXEL_ID", "NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED"];
  const globalKeys = ["window", "localStorage", "sessionStorage", "crypto"];
  let env: Array<string | undefined>;
  let descriptors: Array<PropertyDescriptor | undefined>;
  let consent: string | null;
  let calls: Array<{ event: string; payload: Record<string, unknown>; id?: string }>;
  let timers: Map<number, () => void>;
  let timerId = 0;
  let orderId = 0;
  let order: { ok: true; orderId: string; total: number; lines: Array<{ slug: string; name: string; quantity: number; price: number; sku: string }> };
  const customer = { email: " Buyer@Example.com ", phone: "0300 1234567" };

  function sdk() {
    return {
      identify: (payload: Record<string, string>) => { calls.push({ event: "identify", payload }); },
      track: (event: string, payload?: Record<string, unknown>, options?: { event_id?: string }) => {
        calls.push({ event, payload: payload ?? {}, id: options?.event_id });
      },
    };
  }
  const tick = () => { for (const callback of [...timers.values()]) callback(); };

  beforeEach(() => {
    env = envKeys.map((key) => process.env[key]);
    descriptors = globalKeys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "QA-PIXEL";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
    consent = "all";
    calls = [];
    timers = new Map();
    order = { ok: true, orderId: `QA-MATCH-${++orderId}`, total: 6200,
      lines: [{ slug: "buds", name: "Buds", sku: "BUDS", price: 3000, quantity: 2 }] };
    const storage = new Map<string, string>();
    const store = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) };
    Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {
      location: { hostname: "buyntryy.com", pathname: "/checkout" },
      localStorage: { getItem: () => consent }, ttq: sdk(),
      setInterval: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
      clearInterval: (id: number) => timers.delete(id),
    } });
    for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(globalThis, key, { configurable: true, value: store });
  });
  afterEach(() => {
    globalKeys.forEach((key, index) => {
      if (descriptors[index]) Object.defineProperty(globalThis, key, descriptors[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
    envKeys.forEach((key, index) => { if (env[index] === undefined) delete process.env[key]; else process.env[key] = env[index]; });
  });

  it("identifies synchronously before Purchase without WebCrypto or extra timers", () => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), `purchase_${order.orderId}`);
    assert.deepEqual(calls.map((call) => call.event), ["identify", "Purchase"]);
    assert.deepEqual(calls[0].payload, { email: hash("buyer@example.com"), phone_number: hash("+923001234567") });
    assert.equal(timers.size, 0);
    const server = buildTikTokServerPurchasePayload({ ...order, ...customer, consent: "all" }, "QA-PIXEL")!;
    assert.equal(calls[1].id, server.data[0].event_id);
    assert.equal(calls[1].payload.currency, "PKR");
    assert.equal(calls[1].payload.value, 6200);
    assert.equal((calls[1].payload.contents as Array<{ content_id: string }>)[0].content_id, "BUDS");
    assert.equal(calls[0].payload.phone_number, server.data[0].user.phone);
    assert.equal(JSON.stringify(calls).includes(customer.phone), false);
    assert.equal(JSON.stringify(calls).includes("buyer@example.com"), false);
  });

  for (const phone of ["03001234567", "+923001234567", "923001234567", "3001234567", "0092 300 1234567", "+92 (300) 123-4567"]) {
    it(`normalizes Pakistani phone ${phone} before hashing`, () => {
      trackAcceptedTikTokPurchase(200, order, { phone });
      assert.deepEqual(calls[0].payload, { phone_number: hash("+923001234567") });
      assert.equal(calls[1].event, "Purchase");
    });
  }

  for (const contact of [{}, { email: "bad", phone: "123" }, { email: "cod.923001234567@orders.buyntryy.com" }, { phone: "bad03001234567" }]) {
    it(`ignores unavailable, invalid or generated matching data ${JSON.stringify(contact)}`, () => {
      trackAcceptedTikTokPurchase(200, order, contact);
      assert.deepEqual(calls.map((call) => call.event), ["Purchase"]);
    });
  }

  it("an invalid or generated email does not suppress a valid phone", () => {
    trackAcceptedTikTokPurchase(200, order, { email: "cod.923001234567@orders.buyntryy.com", phone: customer.phone });
    assert.deepEqual(calls[0].payload, { phone_number: hash("+923001234567") });
  });

  it("a valid email does not require a phone", () => {
    trackAcceptedTikTokPurchase(200, order, { email: customer.email, phone: "invalid" });
    assert.deepEqual(calls[0].payload, { email: hash("buyer@example.com") });
  });

  for (const choice of [null, "essential"]) {
    it(`does not identify or track without advertising consent (${choice})`, async () => {
      consent = choice;
      assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
      assert.equal(await identifyTikTokCustomer(customer), false);
      assert.equal(calls.length, 0);
      assert.equal(timers.size, 0);
    });
  }

  it("storage failure fails closed", () => {
    window.localStorage.getItem = () => { throw new Error("blocked"); };
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
    assert.equal(calls.length, 0);
  });

  for (const failure of ["missing", "throwing", "hash_input_failure"]) {
    it(`matching ${failure} cannot delay or drop Purchase`, () => {
      let contact: TikTokCustomer = customer;
      if (failure === "missing") delete window.ttq!.identify;
      if (failure === "throwing") window.ttq!.identify = () => { throw new Error("identify failed"); };
      if (failure === "hash_input_failure") contact = { get email() { throw new Error("contact unavailable"); } };
      assert.equal(trackAcceptedTikTokPurchase(200, order, contact), `purchase_${order.orderId}`);
      assert.deepEqual(calls.map((call) => call.event), ["Purchase"]);
      assert.equal(timers.size, 0);
      assert.equal(trackAcceptedTikTokPurchase(200, { ...order, replayed: true }, contact), null);
    });
  }

  it("late SDK readiness uses one retry queue and identifies immediately before Purchase", () => {
    delete window.ttq;
    trackAcceptedTikTokPurchase(200, order, customer);
    assert.equal(timers.size, 1);
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
    assert.equal(calls.length, 0);
    window.ttq = sdk();
    tick();
    assert.deepEqual(calls.map((call) => call.event), ["identify", "Purchase"]);
    assert.equal(timers.size, 0);
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
  });

  it("consent withdrawal cancels queued identity and Purchase; regrant can retry once", () => {
    delete window.ttq;
    trackAcceptedTikTokPurchase(200, order, customer);
    consent = "essential";
    window.ttq = sdk();
    tick();
    assert.equal(calls.length, 0);
    assert.equal(timers.size, 0);
    consent = "all";
    trackAcceptedTikTokPurchase(200, order, customer);
    assert.deepEqual(calls.map((call) => call.event), ["identify", "Purchase"]);
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
  });

  it("failed SDK tracking can retry without changing the Purchase ID", () => {
    window.ttq!.track = () => { throw new Error("SDK failed"); };
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
    window.ttq = sdk();
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), `purchase_${order.orderId}`);
    assert.equal(trackAcceptedTikTokPurchase(200, order, customer), null);
    assert.equal(calls.filter((call) => call.event === "Purchase").length, 1);
  });

  for (const status of [409, 429, 500]) {
    it(`rejected checkout ${status} cannot identify or convert`, () => {
      assert.equal(trackAcceptedTikTokPurchase(status, order, customer), null);
      assert.equal(calls.length, 0);
    });
  }

  it("standalone identification also works without asynchronous WebCrypto", async () => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    const result = identifyTikTokCustomer(customer);
    assert.equal(calls[0].event, "identify");
    assert.equal(await result, true);
  });
});
