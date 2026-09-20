import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFirstTouch,
  createMemoryRateLimiter,
  ingestLogFields,
  isAllowedAnalyticsOrigin,
  keepOriginalOnDuplicateEventId,
  normalizePathname,
  normalizeSource,
  parseIngestBody,
  sanitizeReferrer,
} from "./analytics-ingest-rules";

describe("parseIngestBody", () => {
  it("accepts a whitelisted page_view and drops extra properties", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "page_view",
      path: "/products?x=1",
      page_type: "catalog",
      properties: { page_type: "nope", extra: true },
      is_demo: true,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.event.name, "page_view");
    assert.equal(parsed.event.path, "/products");
    assert.deepEqual(parsed.event.properties, {});
    assert.equal("is_demo" in parsed.event, false);
  });

  it("rejects unknown event names", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "purchase",
      path: "/",
      page_type: "home",
      properties: {},
    });
    assert.equal(parsed.ok, false);
  });

  it("rejects invalid event_id that is not a UUID", () => {
    const parsed = parseIngestBody({
      event_id: "not-a-uuid",
      name: "page_view",
      path: "/",
      page_type: "home",
      properties: {},
    });
    assert.equal(parsed.ok, false);
  });

  it("rejects add_to_cart when quantity is missing", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "add_to_cart",
      path: "/",
      page_type: "product",
      properties: {},
    });
    assert.equal(parsed.ok, false);
  });

  it("rejects add_to_cart when quantity is not an integer", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "add_to_cart",
      path: "/",
      page_type: "product",
      properties: { quantity: 1.5 },
    });
    assert.equal(parsed.ok, false);
  });

  it("copies product_slug and ignores is_demo", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "product_view",
      path: "/products/widget",
      page_type: "product",
      properties: {},
      product_slug: "widget",
      is_demo: true,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.event.product_slug, "widget");
    assert.equal("is_demo" in parsed.event, false);
  });

  it("rejects checkout_step without a valid step", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "checkout_step",
      path: "/checkout",
      page_type: "checkout",
      properties: { step: "payment" },
    });
    assert.equal(parsed.ok, false);
  });

  it("accepts checkout_validation_error with phone category", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "checkout_validation_error",
      path: "/checkout",
      page_type: "checkout",
      properties: { category: "phone" },
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.event.properties, { category: "phone" });
  });

  it("rejects checkout_validation_error with unknown category", () => {
    const parsed = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "checkout_validation_error",
      path: "/checkout",
      page_type: "checkout",
      properties: { category: "unknown_field" },
    });
    assert.equal(parsed.ok, false);
  });

  it("copies variant_id when it is a UUID and drops a non-UUID", () => {
    const valid = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "product_view",
      path: "/product/pad",
      page_type: "product",
      properties: {},
      product_id: "22222222-2222-4222-8222-222222222222",
      variant_id: "33333333-3333-4333-8333-333333333333",
    });
    assert.equal(valid.ok, true);
    if (!valid.ok) return;
    assert.equal(valid.event.variant_id, "33333333-3333-4333-8333-333333333333");

    const invalid = parseIngestBody({
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "product_view",
      path: "/product/pad",
      page_type: "product",
      properties: {},
      variant_id: "not-a-uuid",
    });
    assert.equal(invalid.ok, true);
    if (!invalid.ok) return;
    assert.equal("variant_id" in invalid.event, false);
  });
});

describe("sanitizeReferrer", () => {
  it("strips query and fragment", () => {
    assert.equal(
      sanitizeReferrer("https://tiktok.com/v/1?click=abc#x"),
      "https://tiktok.com/v/1"
    );
  });
});

describe("normalizeSource", () => {
  it("follows UTM then click id then organic then referral then direct", () => {
    assert.equal(normalizeSource({ utm_source: "tiktok" }).source, "tiktok");
    assert.equal(normalizeSource({ ttclid: "tt" }).source, "tiktok");
    assert.equal(normalizeSource({ fbclid: "fb" }).source, "meta");
    assert.equal(normalizeSource({ gclid: "g" }).source, "google");
    assert.equal(normalizeSource({ referrer: "https://www.google.com/search" }).source, "organic");
    assert.equal(normalizeSource({ referrer: "https://news.example/a" }).source, "referral");
    assert.equal(normalizeSource({}).source, "direct");
    assert.equal(normalizeSource({ utm_source: "???" }).source, "other");
  });

  it("treats a same-origin referrer as direct, not referral", () => {
    assert.equal(
      normalizeSource({
        referrer: "https://voltgear-coral.vercel.app/product/pad",
        shopHost: "voltgear-coral.vercel.app",
      }).source,
      "direct"
    );
    assert.equal(
      normalizeSource({
        referrer: "https://news.example/a",
        shopHost: "voltgear-coral.vercel.app",
      }).source,
      "referral"
    );
  });
});

describe("isAllowedAnalyticsOrigin", () => {
  it("rejects a different origin host", () => {
    assert.equal(isAllowedAnalyticsOrigin("https://evil.example", "voltgear-coral.vercel.app"), false);
    assert.equal(isAllowedAnalyticsOrigin("https://voltgear-coral.vercel.app", "voltgear-coral.vercel.app"), true);
  });

  it("allows missing origin", () => {
    assert.equal(isAllowedAnalyticsOrigin(null, "voltgear-coral.vercel.app"), true);
  });
});

describe("createMemoryRateLimiter", () => {
  it("limits per ip and does not use a global unknown bucket", () => {
    const lim = createMemoryRateLimiter({ limit: 2, windowMs: 60_000, maxKeys: 10 });
    assert.equal(lim.take({ ip: "1.1.1.1" }), true);
    assert.equal(lim.take({ ip: "1.1.1.1" }), true);
    assert.equal(lim.take({ ip: "1.1.1.1" }), false);
    assert.equal(lim.take({ ip: "2.2.2.2" }), true);
    assert.equal(lim.take({}), true);
    assert.equal(lim.take({}), true);
  });
});

describe("normalizePathname", () => {
  it("never keeps a query string", () => {
    assert.equal(normalizePathname("/product/a?utm_source=x"), "/product/a");
  });
});

describe("ingestLogFields", () => {
  it("never includes a query string or raw attribution", () => {
    const fields = ingestLogFields({
      reason: "parse",
      name: "page_view",
      path: "/product/pad?utm_source=tiktok&email=a@b.com&ttclid=secret",
    });
    const serialized = JSON.stringify(fields);
    assert.equal(serialized.includes("?"), false);
    assert.equal(fields.path, "/product/pad");
    assert.equal(fields.reason, "parse");
    assert.equal(fields.name, "page_view");
    assert.equal(serialized.includes("utm_source"), false);
    assert.equal(serialized.includes("ttclid"), false);
    assert.equal(serialized.includes("email"), false);
  });
});

describe("keepOriginalOnDuplicateEventId", () => {
  it("keeps the original row and does not apply the retry payload", () => {
    const original = {
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "page_view",
      path: "/a",
    };
    const retry = {
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "product_view",
      path: "/b?utm_source=x",
    };
    const kept = keepOriginalOnDuplicateEventId(original, retry);
    assert.deepEqual(kept, original);
    assert.equal(kept.name, "page_view");
    assert.equal(kept.path, "/a");
  });
});

describe("buildFirstTouch", () => {
  it("caps campaign and click ids when storing first-touch", () => {
    const long = "x".repeat(200);
    const touch = buildFirstTouch(
      {
        utm_campaign: long,
        utm_id: long,
        ttclid: long,
        referrer: "https://tiktok.com/v/1?click=abc",
      },
      "/product/pad?utm_source=tiktok",
      "shop.test"
    );
    assert.equal(touch.campaign?.length, 80);
    assert.equal(touch.campaign_id?.length, 80);
    assert.equal(touch.ttclid?.length, 200);
    assert.equal(touch.referrer?.includes("?"), false);
    assert.equal(touch.landing_path, "/product/pad");
  });
});
