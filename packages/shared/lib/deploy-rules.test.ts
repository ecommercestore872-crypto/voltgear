import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isCronAuthorized, publicSiteUrl, resolveAdminSecret } from "./deploy-rules";

describe("publicSiteUrl", () => {
  it("prefers an explicit public origin, then Vercel, then localhost", () => {
    assert.equal(
      publicSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://shop.example.com/" }),
      "https://shop.example.com"
    );
    assert.equal(
      publicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        VERCEL_URL: "voltgear.vercel.app",
      }),
      "https://voltgear.vercel.app"
    );
    assert.equal(publicSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "shop.vercel.app" }), "https://shop.vercel.app");
    assert.equal(publicSiteUrl({}), "http://localhost:3000");
  });
});

describe("resolveAdminSecret", () => {
  it("requires ADMIN_TOKEN in production and keeps the local demo fallback", () => {
    assert.equal(resolveAdminSecret({ ADMIN_TOKEN: "secret-a" }), "secret-a");
    assert.equal(resolveAdminSecret({ REVALIDATION_TOKEN: "secret-b" }), "secret-b");
    assert.equal(resolveAdminSecret({ NODE_ENV: "development" }), "voltgear-demo-revalidate");
    assert.throws(() => resolveAdminSecret({ NODE_ENV: "production" }), /ADMIN_TOKEN/);
    assert.throws(() => resolveAdminSecret({ VERCEL_ENV: "production" }), /ADMIN_TOKEN/);
  });
});

describe("isCronAuthorized", () => {
  it("allows local unsigned requests and requires the bearer secret in production", () => {
    assert.equal(isCronAuthorized(null, { NODE_ENV: "development" }), true);
    assert.equal(isCronAuthorized(null, { NODE_ENV: "production" }), false);
    assert.equal(
      isCronAuthorized("Bearer cron-1", { NODE_ENV: "production", CRON_SECRET: "cron-1" }),
      true
    );
    assert.equal(
      isCronAuthorized("Bearer nope", { NODE_ENV: "production", CRON_SECRET: "cron-1" }),
      false
    );
  });
});
