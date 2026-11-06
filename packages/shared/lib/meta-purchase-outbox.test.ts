import assert from "node:assert/strict";
import { test } from "node:test";
import { sendMetaOutboxRow } from "./meta-purchase-outbox";

function row(orderId = "BNT-QA-1") {
  return {
    id: "qa-id", order_id: orderId, lease_token: "qa-lease", attempts: 1,
    event_time: new Date().toISOString(),
    payload: { data: [{ event_name: "Purchase", event_id: orderId,
      event_time: Math.floor(Date.now() / 1000), action_source: "website",
      user_data: { em: ["a".repeat(64)] }, custom_data: { value: 120, currency: "PKR" } }] },
  };
}

test("outbox sender preserves event ID and accepts only a one-event Meta receipt", async () => {
  const prior = { ...process.env };
  try {
    process.env.NEXT_PUBLIC_META_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789";
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "qa-token";
    process.env.META_TEST_EVENT_CODE = "qa-code";
    process.env.VERCEL_ENV = "preview";
    let body: Record<string, unknown> | null = null;
    const result = await sendMetaOutboxRow(row() as never, async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response('{"events_received":1}', { status: 200 });
    });
    assert.equal(result.delivered, true);
    assert.equal((body?.data as Array<{ event_id: string }>)[0]?.event_id, "BNT-QA-1");
    assert.equal(body?.test_event_code, "qa-code");
    assert.equal(JSON.stringify(body).includes("qa-token"), false);
    const rejected = await sendMetaOutboxRow(row() as never, async () => new Response('{"events_received":0}', { status: 200 }));
    assert.equal(rejected.delivered, false);
    assert.equal(rejected.reason, "provider_rejected");
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in prior)) delete process.env[key];
    Object.assign(process.env, prior);
  }
});

test("outbox sender respects Retry-After, rejects malformed identity, and redacts transport failures", async () => {
  const prior = { ...process.env };
  try {
    process.env.NEXT_PUBLIC_META_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789";
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "qa-token";
    process.env.META_TEST_EVENT_CODE = "qa-code";
    process.env.VERCEL_ENV = "preview";
    const limited = await sendMetaOutboxRow(row() as never, async () => new Response('{"error":{"code":4}}', {
      status: 429, headers: { "retry-after": "120" },
    }));
    assert.deepEqual(limited, { delivered: false, httpStatus: 429, reason: "rate_limit", retryAfterSeconds: 120 });
    const mismatch = await sendMetaOutboxRow(row("BNT-QA-2") as never, async () => { throw new Error("must not fetch"); });
    assert.equal(mismatch.delivered, false);
    const failed = await sendMetaOutboxRow(row() as never, async () => { throw new Error("qa-token customer@example.com"); });
    assert.deepEqual(failed, { delivered: false, reason: "network" });
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in prior)) delete process.env[key];
    Object.assign(process.env, prior);
  }
});
