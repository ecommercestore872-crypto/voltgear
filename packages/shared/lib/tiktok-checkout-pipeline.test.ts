import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it } from "node:test";
import ts from "typescript";
import { buildCheckoutRequestFingerprint, scopeCheckoutIdempotencyKey } from "./checkout-idempotency";
import { trackTikTokServerPurchase } from "./tiktok-events-api";
import { acceptedTikTokPurchase } from "./tiktok-checkout-result";
import { deferAfterResponse } from "./defer-after-response";
import { checkoutReplayMatches } from "./checkout-replay-rules";

function load(source: URL, dependencies: Record<string, unknown>) {
  const module = { exports: {} as Record<string, (...args: any[]) => any> };
  const code = ts.transpileModule(readFileSync(source, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, Response, Request, performance,
    console: { error() {}, info() {} },
    require: (name: string) => {
      assert.ok(name in dependencies, `Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

describe("actual checkout route → post-persist tracking → Events API", () => {
  for (const mode of ["no_explicit_mode", "no_test_code", "isolated"]) {
    it(`Test Events probe: ${mode}`, async () => {
      const env: Record<string, string> = {
        TIKTOK_TEST_PIXEL_ID: "QA-PIXEL", TIKTOK_EVENTS_API_ACCESS_TOKEN: "QA-TOKEN",
        TIKTOK_ISOLATED_TEST_MODE: "true", TIKTOK_TEST_EVENT_CODE: "QA-CODE",
      };
      if (mode === "no_explicit_mode") delete env.TIKTOK_ISOLATED_TEST_MODE;
      if (mode === "no_test_code") delete env.TIKTOK_TEST_EVENT_CODE;
      const processStub = { env, exitCode: 0 };
      let sent = 0;
      const source = readFileSync(new URL("../../../scripts/tiktok-synthetic-test.ts", import.meta.url), "utf8").replace(/\brun\(\);\s*$/, "");
      const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
      await runInNewContext(`${code}\nrun();`, {
        process: processStub, crypto: { randomUUID: () => "QA-ID" }, AbortSignal,
        console: { error() {}, log() {} },
        fetch: async (url: string, init: RequestInit) => {
          sent++;
          assert.equal(url, "https://business-api.tiktok.com/open_api/v1.3/event/track/");
          const body = JSON.parse(String(init.body));
          assert.equal(body.test_event_code, "QA-CODE");
          assert.equal(body.event_source_id, "QA-PIXEL");
          assert.equal(body.data[0].event, "PageView");
          assert.equal(body.data[0].properties, undefined);
          return new Response('{"code":0}');
        },
      });
      assert.equal(sent, mode === "isolated" ? 1 : 0);
      assert.equal(processStub.exitCode, mode === "isolated" ? 0 : 1);
    });
  }

  it("registers Vercel continuation synchronously and sanitizes task failures", async () => {
    const key = Symbol.for("@vercel/request-context");
    const globals = globalThis as unknown as Record<symbol, unknown>;
    const original = globals[key];
    const originalError = console.error;
    let continuation: Promise<unknown> | undefined;
    let executed = false;
    const logs: string[] = [];
    globals[key] = { get: () => ({ waitUntil: (promise: Promise<unknown>) => { continuation = promise; } }) };
    console.error = (...values) => logs.push(values.join(" "));
    try {
      deferAfterResponse(async () => { executed = true; throw new Error("customer@example.com SECRET_TOKEN"); });
      assert.ok(continuation, "must register before returning to the route");
      assert.equal(executed, false);
      await continuation;
      assert.equal(executed, true);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].includes("customer@example.com"), false);
      assert.equal(logs[0].includes("SECRET_TOKEN"), false);
    } finally {
      if (original === undefined) delete globals[key]; else globals[key] = original;
      console.error = originalError;
    }
  });

  for (const mode of ["success", "replay", "distributed_replay", "distributed_conflict", "price_changed", "rate_limit", "persistence_failure", "consent_denied", "demo", "cache_conflict"]) {
    it(mode, async () => {
      const originalFetch = global.fetch;
      const keys = ["NEXT_PUBLIC_TIKTOK_PIXEL_ID", "NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED", "TIKTOK_EVENTS_API_ACCESS_TOKEN"];
      const env = keys.map((key) => process.env[key]);
      process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
      process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
      process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "TEST_ONLY";
      const timeline: string[] = [];
      const tasks: Array<() => Promise<void>> = [];
      const sent: any[] = [];
      let persisted = 0;
      let attributionWrites = 0;
      const customer = { name: "QA", email: "qa@example.com", phone: "+923001234567", address: "QA address", province: "PB", city: "Lahore", cityId: "lahore" };
      const lines = [{ slug: "qa", name: "QA product", quantity: 2, price: 3000, sku: "QA-SKU" }];
      const existing = { orderId: "QA-ORDER", customer, items: lines, total: 6200, subtotal: 6000, shipping: 200 };
      global.fetch = async (_url, init) => {
        assert.equal(timeline.includes("persisted"), true, "API delivery must follow persistence");
        sent.push(JSON.parse(String(init!.body)));
        timeline.push("tracked");
        return new Response('{"code":0}');
      };
      const tracking = load(new URL("./checkout-post-persist-tracking.ts", import.meta.url), {
        "@/lib/checkout-guard": { checkoutClientIp: () => "203.0.113.9" },
        "@/lib/checkout-tracking-rules": { readMetaCookieIds: () => ({}) },
        "@/lib/db/order-attribution": { attachOrderAttribution: async () => { attributionWrites++; return { attrib_ttclid: "QA-CLICK" }; } },
        "@/lib/meta-events-api": { trackMetaServerPurchase: async () => {} },
        "@/lib/tiktok-events-api": { trackTikTokServerPurchase },
      });
      const route = load(new URL("../../../apps/storefront/app/api/checkout/route.ts", import.meta.url), {
        "next/server": { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
        "@/lib/db/store": {
          getOrderByPublicId: async () => existing,
          getOrderByIdempotencyKey: async () => mode === "distributed_replay" ? existing : mode === "distributed_conflict" ? { ...existing, customer: { ...customer, address: "different address" } } : null,
        },
        "@/lib/checkout-server": { CHECKOUT_PRICE_CHANGED_ERROR: "changed", resolveCheckout: async () => ({ ok: mode === "price_changed" ? "price_changed" : true, items: [], checkout: { lines, subtotal: 6000, shipping: 200, total: 6200 } }) },
        "@/lib/demo": { isDemoRequest: () => mode === "demo" },
        "@/lib/db/demo-rules": { orderIsDemo: (value: boolean) => value },
        "@/lib/db/deal-store": { listProductDeals: async () => [] },
        "@/lib/defer-after-response": { deferAfterResponse: (task: () => Promise<void>) => tasks.push(task) },
        "@/lib/checkout-post-persist": { runCheckoutPostPersist: tracking.runCheckoutTracking },
        "@/lib/checkout-pricing": { resolveCheckoutPricing: async () => ({ ok: true, pricing: { finalShipping: 200, finalTotal: 6200, discount: 0, appliedPromo: null } }) },
        "@/lib/checkout-persistence": { persistCheckoutOrder: async () => {
          persisted++;
          if (mode === "persistence_failure") return null;
          timeline.push("persisted");
          return { orderId: "QA-ORDER", replayed: mode === "replay" };
        } },
        "@/lib/checkout-guard": { cacheCheckoutOrder() {}, checkoutClientIp: () => "QA", readIdempotencyKey: () => "QA-IDEMPOTENCY", getCachedCheckoutOrder: () => mode === "cache_conflict" ? { orderId: "QA-ORDER", fingerprint: "different" } : null, takeCheckoutRateLimit: () => ({ ok: mode !== "rate_limit", error: "limited" }) },
        "@/lib/checkout-observability": { checkoutSloLog() {} },
        "@/lib/email-checkout-rules": { checkoutHttpStatusAfterOrderPersisted: () => 200 },
        "@/lib/checkout-customer-rules": { normalizeCheckoutCustomer: () => ({ ok: true, customer }) },
        "@/lib/checkout-idempotency": { buildCheckoutRequestFingerprint, scopeCheckoutIdempotencyKey },
        "@/lib/checkout-replay-rules": { checkoutReplayMatches },
      });
      try {
        const response: Response = await route.POST(new Request("https://buyntryy.test/api/checkout", {
          method: "POST", headers: { "Content-Type": "application/json", cookie: "_ttp=QA-COOKIE" },
          body: JSON.stringify({ items: lines, customer, consent: mode === "consent_denied" ? "essential" : "all" }),
        }));
        const data = await response.json();
        assert.equal(sent.length, 0, "post-response task must not delay acceptance");
        for (const task of tasks) await task();
        const expectedStatus = mode === "rate_limit" ? 429 : ["price_changed", "cache_conflict", "distributed_conflict"].includes(mode) ? 409 : mode === "persistence_failure" ? 500 : 200;
        assert.equal(response.status, expectedStatus);
        assert.equal(sent.length, mode === "success" ? 1 : 0);
        assert.equal(persisted, ["price_changed", "rate_limit", "cache_conflict", "distributed_replay", "distributed_conflict"].includes(mode) ? 0 : 1);
        if (mode === "success") {
          const browser = acceptedTikTokPurchase(response.status, data)!;
          assert.equal(sent[0].data[0].event_id, `purchase_${browser.orderId}`);
          assert.equal(sent[0].data[0].properties.value, browser.total);
          assert.equal(sent[0].data[0].user.ttp, "QA-COOKIE");
          assert.equal(sent[0].data[0].user.ttclid, "QA-CLICK");
        }
        if (mode === "consent_denied" || mode === "demo") assert.equal(attributionWrites, 0);
        if (expectedStatus !== 200 || mode === "demo") assert.equal(acceptedTikTokPurchase(response.status, data), null);
        if (mode === "replay" || mode === "distributed_replay") {
          assert.equal(tasks.length, 0, "replay must not repeat side effects");
          assert.equal(acceptedTikTokPurchase(200, data)!.orderId, "QA-ORDER");
        }
      } finally {
        global.fetch = originalFetch;
        keys.forEach((key, index) => { if (env[index] === undefined) delete process.env[key]; else process.env[key] = env[index]; });
      }
    });
  }
});
