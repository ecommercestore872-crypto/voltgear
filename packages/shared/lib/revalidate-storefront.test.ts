import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

describe("revalidateStorefront", () => {
  const originalFetch = globalThis.fetch;
  const originalStorefrontUrl = process.env.STOREFRONT_URL;
  const originalAdminToken = process.env.ADMIN_TOKEN;

  beforeEach(() => {
    process.env.ADMIN_TOKEN = "test-admin-token";
    delete process.env.STOREFRONT_URL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalStorefrontUrl === undefined) delete process.env.STOREFRONT_URL;
    else process.env.STOREFRONT_URL = originalStorefrontUrl;
    if (originalAdminToken === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = originalAdminToken;
  });

  test("POSTs path list to storefront revalidate API", async () => {
    process.env.STOREFRONT_URL = "https://shop.example.com";
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = mock.fn(async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ revalidated: true }), { status: 200 });
    }) as typeof fetch;

    const { revalidateStorefront } = await import("./revalidate-storefront.js");
    const result = await revalidateStorefront(["/", "/products"]);

    assert.strictEqual(result.ok, true);
    assert.strictEqual(
      capturedUrl,
      "https://shop.example.com/api/revalidate",
    );
    assert.strictEqual(
      (capturedInit?.headers as Record<string, string>)?.Authorization,
      "Bearer test-admin-token",
    );
    assert.deepStrictEqual(JSON.parse(String(capturedInit?.body)), {
      paths: [{ path: "/" }, { path: "/products" }],
    });
  });
});
