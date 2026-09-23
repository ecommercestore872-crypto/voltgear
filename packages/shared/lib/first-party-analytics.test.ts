import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  captureLandingAttribution,
  checkoutValidationCategoryFromHttp,
  createFirstPartyClient,
  pageTypeFromPath,
  shouldCollectPath,
  validationCategoryFromFieldName,
} from "./first-party-analytics";

describe("shouldCollectPath", () => {
  it("skips admin and legacy /home2 preview, allows live Biometic shop", () => {
    assert.equal(shouldCollectPath("/home2"), false);
    assert.equal(shouldCollectPath("/admin/analytics"), false);
    assert.equal(shouldCollectPath("/"), true);
    assert.equal(shouldCollectPath("/product/pad"), true);
    assert.equal(shouldCollectPath("/product2/pad"), true);
    assert.equal(shouldCollectPath("/products2"), true);
    assert.equal(shouldCollectPath("/products2/earbuds"), true);
    assert.equal(shouldCollectPath("/checkout"), true);
  });
});

describe("pageTypeFromPath", () => {
  it("maps live shop paths to page types", () => {
    assert.equal(pageTypeFromPath("/checkout"), "checkout");
    assert.equal(pageTypeFromPath("/products"), "catalog");
    assert.equal(pageTypeFromPath("/"), "home");
    assert.equal(pageTypeFromPath("/product/pad"), "product");
    assert.equal(pageTypeFromPath("/products/chargers"), "catalog");
    assert.equal(pageTypeFromPath("/cart"), "cart");
    assert.equal(pageTypeFromPath("/search"), "search");
    assert.equal(pageTypeFromPath("/blog/hello"), "content");
    assert.equal(pageTypeFromPath("/warranty"), "content");
    assert.equal(pageTypeFromPath("/product2/pad"), "product");
    assert.equal(pageTypeFromPath("/products2"), "catalog");
    assert.equal(pageTypeFromPath("/products2/chargers"), "catalog");
    assert.equal(pageTypeFromPath("/track"), "other");
  });
});

describe("captureLandingAttribution", () => {
  it("parses utm and click ids and sanitizes referrer", () => {
    const attribution = captureLandingAttribution(
      "https://shop.test/product/pad?utm_source=tiktok&ttclid=abc",
      "https://www.tiktok.com/t/x?foo=1",
    );
    assert.equal(attribution.utm_source, "tiktok");
    assert.equal(attribution.ttclid, "abc");
    assert.equal(attribution.referrer, "https://www.tiktok.com/t/x");
    assert.ok(!attribution.referrer?.includes("?"));
  });
});

describe("createFirstPartyClient", () => {
  it("sends the first event before the second on a cookie-less PDP", async () => {
    const calls: string[] = [];
    let firstBody: Record<string, unknown> | undefined;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const client = createFirstPartyClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (calls.length === 0) firstBody = body;
        calls.push(body.name);
        if (calls.length === 1) await gate;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      getHref: () => "https://shop.test/product/pad?utm_source=tiktok&ttclid=abc",
      getReferrer: () => "https://www.tiktok.com/t/x?foo=1",
    });
    const p1 = client.track({ name: "page_view", path: "/product/pad", page_type: "product" });
    const p2 = client.track({
      name: "product_view",
      path: "/product/pad",
      page_type: "product",
      product_id: "11111111-1111-4111-8111-111111111111",
    });
    await Promise.resolve();
    assert.deepEqual(calls, ["page_view"]);
    release();
    await Promise.all([p1, p2]);
    assert.deepEqual(calls, ["page_view", "product_view"]);
    assert.equal(
      (firstBody?.attribution as { utm_source?: string } | undefined)?.utm_source,
      "tiktok",
    );
    assert.ok(
      !String((firstBody?.attribution as { referrer?: string } | undefined)?.referrer).includes(
        "?",
      ),
    );
  });

  it("retries attribution on the next event when the first fetch fails", async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = createFirstPartyClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        bodies.push(body);
        if (bodies.length === 1) {
          throw new Error("network error");
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      getHref: () => "https://shop.test/product/pad?utm_source=tiktok&ttclid=abc",
      getReferrer: () => "https://www.tiktok.com/t/x?foo=1",
    });
    await client.track({ name: "page_view", path: "/product/pad", page_type: "product" });
    await client.track({
      name: "product_view",
      path: "/product/pad",
      page_type: "product",
      product_id: "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(bodies.length, 2);
    assert.equal(
      (bodies[1]?.attribution as { utm_source?: string } | undefined)?.utm_source,
      "tiktok",
    );
  });

  it("includes properties, variant_id, and product_slug in the POST body", async () => {
    let body: Record<string, unknown> | undefined;
    const client = createFirstPartyClient({
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      getHref: () => "https://shop.test/product/pad",
      getReferrer: () => "",
    });
    await client.track({
      name: "add_to_cart",
      path: "/product/pad",
      page_type: "product",
      product_id: "11111111-1111-4111-8111-111111111111",
      variant_id: "22222222-2222-4222-8222-222222222222",
      product_slug: "pad",
      properties: { quantity: 2 },
    });
    assert.equal(body?.variant_id, "22222222-2222-4222-8222-222222222222");
    assert.equal(body?.product_slug, "pad");
    assert.deepEqual(body?.properties, { quantity: 2 });
  });
});

describe("validationCategoryFromFieldName", () => {
  it("maps known checkout fields and falls back to other", () => {
    assert.equal(validationCategoryFromFieldName("name"), "name");
    assert.equal(validationCategoryFromFieldName("email"), "email");
    assert.equal(validationCategoryFromFieldName("phone"), "phone");
    assert.equal(validationCategoryFromFieldName("address"), "address");
    assert.equal(validationCategoryFromFieldName("city"), "city");
    assert.equal(validationCategoryFromFieldName("postal"), "other");
  });
});

describe("checkoutValidationCategoryFromHttp", () => {
  it("maps 409 and known 400s and ignores other statuses", () => {
    assert.equal(checkoutValidationCategoryFromHttp(409), "price_changed");
    assert.equal(
      checkoutValidationCategoryFromHttp(400, "Your cart is empty."),
      "empty_cart",
    );
    assert.equal(
      checkoutValidationCategoryFromHttp(400, "One of your items is sold out. Please remove it and try again."),
      "stock",
    );
    assert.equal(
      checkoutValidationCategoryFromHttp(400, "One of your items is no longer available. Please remove it and try again."),
      "stock",
    );
    assert.equal(
      checkoutValidationCategoryFromHttp(400, "Name, email, phone and address are required."),
      "other",
    );
    assert.equal(checkoutValidationCategoryFromHttp(500, "boom"), null);
  });
});
