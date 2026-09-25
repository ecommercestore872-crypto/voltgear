import assert from "node:assert";
import { describe, mock, test } from "node:test";

import { postStorefrontRevalidate } from "./revalidate-storefront-http";

describe("postStorefrontRevalidate", () => {
  test("POSTs path list to storefront revalidate API", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const fetchFn = mock.fn(async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ revalidated: true }), { status: 200 });
    }) as typeof fetch;

    const result = await postStorefrontRevalidate(
      "https://shop.example.com",
      "test-admin-token",
      [{ path: "/" }, { path: "/products" }],
      fetchFn,
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(capturedUrl, "https://shop.example.com/api/revalidate");
    assert.strictEqual(
      (capturedInit?.headers as Record<string, string>)?.Authorization,
      "Bearer test-admin-token",
    );
    assert.deepStrictEqual(JSON.parse(String(capturedInit?.body)), {
      paths: [{ path: "/" }, { path: "/products" }],
    });
  });

  test("surfaces HTTP errors from the shop revalidate API", async () => {
    const fetchFn = mock.fn(async () => new Response("bad token", { status: 401 })) as typeof fetch;

    const result = await postStorefrontRevalidate(
      "https://shop.example.com",
      "token",
      [{ path: "/products" }],
      fetchFn,
    );

    assert.strictEqual(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    assert.strictEqual(result.status, 401);
    assert.match(result.error, /bad token/);
  });
});
