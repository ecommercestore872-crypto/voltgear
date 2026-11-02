import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, describe, it } from "node:test";

import { buildTikTokServerPurchasePayload, trackTikTokServerPurchase } from "./tiktok-events-api";

const originalFetch = global.fetch;
const originalEnv = {
  pixel: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
  token: process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN,
  enabled: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED,
  fallback: process.env.TIKTOK_ACCESS_TOKEN,
  testCode: process.env.TIKTOK_TEST_EVENT_CODE,
};

afterEach(() => {
  global.fetch = originalFetch;
  if (originalEnv.pixel === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = originalEnv.pixel;
  if (originalEnv.token === undefined) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = originalEnv.token;
  if (originalEnv.enabled === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;
  else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = originalEnv.enabled;
  if (originalEnv.fallback === undefined) delete process.env.TIKTOK_ACCESS_TOKEN;
  else process.env.TIKTOK_ACCESS_TOKEN = originalEnv.fallback;
  if (originalEnv.testCode === undefined) delete process.env.TIKTOK_TEST_EVENT_CODE;
  else process.env.TIKTOK_TEST_EVENT_CODE = originalEnv.testCode;
});

describe("TikTok transport and privacy regressions", () => {
  function configure() {
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
    process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "SECRET_TEST_TOKEN";
  }

  it("authenticates only in the header and ignores persistent test codes", async () => {
    configure();
    process.env.TIKTOK_TEST_EVENT_CODE = "DO_NOT_SEND";
    let calls = 0;
    global.fetch = async (url, init) => {
      calls++;
      assert.equal(String(url).includes("SECRET_TEST_TOKEN"), false);
      assert.equal((init!.headers as Record<string, string>)["Access-Token"], "SECRET_TEST_TOKEN");
      assert.equal((init!.headers as Record<string, string>)["Content-Type"], "application/json");
      assert.ok(init!.signal);
      const text = String(init!.body);
      for (const forbidden of ["SECRET_TEST_TOKEN", "DO_NOT_SEND", "test_event_code", "ALICE@", "0300 1234567"]) {
        assert.equal(text.includes(forbidden), false);
      }
      return new Response('{"code":0}', { status: 200 });
    };
    await trackTikTokServerPurchase(input);
    assert.equal(calls, 1);
  });

  it("missing both credentials fails safely without a request", async () => {
    configure();
    delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    delete process.env.TIKTOK_ACCESS_TOKEN;
    let calls = 0;
    global.fetch = async () => { calls++; throw new Error("should not send"); };
    await trackTikTokServerPurchase(input);
    assert.equal(calls, 0);
  });

  it("uses the existing fallback token when the preferred token is absent", async () => {
    configure();
    delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    process.env.TIKTOK_ACCESS_TOKEN = "FALLBACK_TEST";
    let called = false;
    global.fetch = async (_url, init) => {
      called = true;
      assert.equal((init!.headers as Record<string, string>)["Access-Token"], "FALLBACK_TEST");
      return new Response('{"code":0}');
    };
    await trackTikTokServerPurchase(input);
    assert.equal(called, true);
  });

  it("omits generated COD email, invalid matching values and sensitive URL queries", () => {
    const payload = buildTikTokServerPurchasePayload({ ...input, email: "cod.923001234567@orders.buyntryy.com", phone: "invalid", url: "https://buyntryy.com/checkout?phone=03001234567#private" }, "PIXEL")!;
    assert.equal(payload.data[0].user.email, undefined);
    assert.equal(payload.data[0].user.phone, undefined);
    assert.equal(payload.data[0].page.url, "https://buyntryy.com/checkout");
    assert.equal(JSON.stringify(payload).includes("03001234567"), false);
  });

  it("normalizes Pakistani international dial prefixes before hashing", () => {
    const a = buildTikTokServerPurchasePayload({ ...input, phone: "0092 300 1234567" }, "PIXEL")!;
    const b = buildTikTokServerPurchasePayload({ ...input, phone: "+923001234567" }, "PIXEL")!;
    assert.equal(a.data[0].user.phone, b.data[0].user.phone);
  });

  for (const failure of ["application", "malformed", "unauthorized", "server", "network"]) {
    it(`handles ${failure} failure with bounded retries and sanitized logs`, async () => {
      configure();
      let calls = 0;
      const logs: string[] = [];
      const error = console.error;
      const info = console.info;
      console.error = (...values) => logs.push(values.map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" "));
      console.info = (...values) => logs.push(values.map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" "));
      global.fetch = async () => {
        calls++;
        if (failure === "network") throw new Error("SECRET_TEST_TOKEN alice@example.com");
        if (failure === "malformed") return new Response("{}");
        return new Response(JSON.stringify({ code: 40001, message: "SECRET_TEST_TOKEN alice@example.com" }), { status: failure === "server" ? 503 : failure === "unauthorized" ? 401 : 200 });
      };
      try {
        await trackTikTokServerPurchase(input);
        assert.equal(calls, ["server", "network"].includes(failure) ? 2 : 1);
        assert.equal(logs.join().includes('"outcome":"sent"'), false);
        assert.equal(logs.join().includes("SECRET_TEST_TOKEN"), false);
        assert.equal(logs.join().includes("alice@example.com"), false);
        assert.equal(logs.join().includes('"outcome":"failed"'), true);
      } finally { console.error = error; console.info = info; }
    });
  }

  it("retries a transient failure using the identical event ID and timestamp", async () => {
    configure();
    const requests: string[] = [];
    global.fetch = async (_url, init) => {
      requests.push(String(init!.body));
      return requests.length === 1 ? new Response("{}", { status: 429 }) : new Response('{"code":0}');
    };
    await trackTikTokServerPurchase(input);
    assert.equal(requests.length, 2);
    assert.equal(requests[0], requests[1]);
  });
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
