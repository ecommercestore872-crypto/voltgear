import assert from "node:assert/strict";
import { test } from "node:test";
import { supabaseRequestLogPath } from "./request-log-path";
import { getServiceClient } from "./server";

test("Supabase diagnostics retain only a safe table path", () => {
  const url = "https://example.supabase.co/rest/v1/orders?email=private%40example.com";
  assert.equal(supabaseRequestLogPath(url), "/rest/v1/orders");
  assert.equal(supabaseRequestLogPath(new Request(url)), "/rest/v1/orders");
  assert.equal(supabaseRequestLogPath("https://example.supabase.co/auth/v1/user/secret"), "/other");
});

test("service-role reads bypass the shared fetch cache for catalog and private rows", async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const options: Array<RequestInit | undefined> = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  global.fetch = (async (_input, init) => {
    options.push(init);
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const client = getServiceClient();
    await client.from("products").select("id").limit(1);
    await client.from("orders").select("id").limit(1);
    assert.equal(options.length, 2);
    assert.ok(options.every((option) => option?.cache === "no-store"));
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});
