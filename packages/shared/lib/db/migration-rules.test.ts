import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCatalogNotEmpty,
  assertNoSanityCdnUrls,
  chooseImageBackend,
  isCloudinaryConfigured,
  isSanityCdnUrl,
  readSupabaseEnv,
  shouldBlockSecondCheckout,
} from "./migration-rules";

describe("assertCatalogNotEmpty", () => {
  it("throws when product count is zero", () => {
    assert.throws(() => assertCatalogNotEmpty(0), /empty/i);
  });

  it("passes when at least one product exists", () => {
    assert.doesNotThrow(() => assertCatalogNotEmpty(1));
  });
});

describe("Sanity CDN URLs", () => {
  it("detects cdn.sanity.io", () => {
    assert.equal(
      isSanityCdnUrl("https://cdn.sanity.io/images/abc/production/x.jpg"),
      true
    );
  });

  it("allows Cloudinary and Supabase URLs", () => {
    assert.equal(
      isSanityCdnUrl("https://res.cloudinary.com/demo/image/upload/x.jpg"),
      false
    );
    assert.equal(
      isSanityCdnUrl(
        "https://zeuhfqevqjkbzwdaxjuv.supabase.co/storage/v1/object/public/product-images/x.jpg"
      ),
      false
    );
  });

  it("fails the cutover when any URL is still on Sanity CDN", () => {
    assert.throws(
      () =>
        assertNoSanityCdnUrls([
          "https://res.cloudinary.com/demo/image/upload/x.jpg",
          "https://cdn.sanity.io/images/abc/production/x.jpg",
        ]),
      /sanity/i
    );
  });
});

describe("chooseImageBackend", () => {
  it("uses Cloudinary when cloud name, key, and secret are set", () => {
    assert.equal(
      chooseImageBackend(
        isCloudinaryConfigured({
          cloudName: "demo",
          apiKey: "key",
          apiSecret: "secret",
        })
      ),
      "cloudinary"
    );
  });

  it("falls back to Supabase Storage when Cloudinary is incomplete", () => {
    assert.equal(
      chooseImageBackend(
        isCloudinaryConfigured({
          cloudName: "demo",
          apiKey: "",
          apiSecret: "secret",
        })
      ),
      "supabase"
    );
  });
});

describe("readSupabaseEnv", () => {
  it("throws when the service role key is missing", () => {
    assert.throws(
      () =>
        readSupabaseEnv({
          url: "https://example.supabase.co",
          anonKey: "anon",
          serviceRoleKey: "",
        }),
      /service/i
    );
  });

  it("returns the env when url and service role are present", () => {
    const env = readSupabaseEnv({
      url: "https://example.supabase.co",
      anonKey: "anon",
      serviceRoleKey: "service",
    });
    assert.equal(env.url, "https://example.supabase.co");
    assert.equal(env.serviceRoleKey, "service");
  });
});

describe("shouldBlockSecondCheckout", () => {
  it("blocks when a request is already in flight", () => {
    assert.equal(shouldBlockSecondCheckout({ inFlight: true, alreadyPlaced: false }), true);
  });

  it("blocks when an order was already placed", () => {
    assert.equal(shouldBlockSecondCheckout({ inFlight: false, alreadyPlaced: true }), true);
  });

  it("allows the first submit", () => {
    assert.equal(shouldBlockSecondCheckout({ inFlight: false, alreadyPlaced: false }), false);
  });
});
