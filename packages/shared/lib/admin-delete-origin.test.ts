import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAllowedAdminDeleteOrigin } from "./admin-delete-origin";

const production = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://buyntryy.com/",
  NEXT_PUBLIC_ADMIN_ASSET_ORIGIN: "https://voltgear-admin-pi.vercel.app/",
  VERCEL_URL: "voltgear-admin-release.vercel.app",
};

describe("admin order deletion origin", () => {
  it("accepts the public browser origin when the request reaches the admin upstream", () => {
    const request = new Request("https://voltgear-admin-pi.vercel.app/api/admin/orders/test", {
      method: "DELETE", headers: { Origin: "https://buyntryy.com" },
    });
    assert.notEqual(request.headers.get("origin"), new URL(request.url).origin);
    assert.equal(isAllowedAdminDeleteOrigin(request.headers.get("origin"), production), true);
  });

  it("accepts direct access to the configured admin deployment and its Vercel URL", () => {
    assert.equal(isAllowedAdminDeleteOrigin("https://voltgear-admin-pi.vercel.app", production), true);
    assert.equal(isAllowedAdminDeleteOrigin("https://voltgear-admin-release.vercel.app", production), true);
  });

  it("rejects foreign, lookalike, malformed and missing origins even with spoofed host headers", () => {
    const request = new Request("https://voltgear-admin-pi.vercel.app/api/admin/orders/test", {
      method: "DELETE",
      headers: { Origin: "https://evil.example", Host: "buyntryy.com", "X-Forwarded-Host": "buyntryy.com" },
    });
    assert.equal(isAllowedAdminDeleteOrigin(request.headers.get("origin"), production), false);
    for (const origin of ["https://buyntryy.com.evil.example", "http://buyntryy.com", "null", "https://buyntryy.com, https://evil.example", "https://buyntryy.com/"]) {
      assert.equal(isAllowedAdminDeleteOrigin(origin, production), false, origin);
    }
    assert.equal(isAllowedAdminDeleteOrigin(null, production), false);
  });

  it("fails closed on unapproved or malformed deployment configuration", () => {
    assert.equal(isAllowedAdminDeleteOrigin("https://buyntryy.com", { NODE_ENV: "production" }), false);
    assert.equal(isAllowedAdminDeleteOrigin("https://buyntryy.com", {
      NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://buyntryy.com/checkout",
    }), false);
    assert.equal(isAllowedAdminDeleteOrigin("https://voltgear-admin-release.vercel.app", {
      NODE_ENV: "production", VERCEL_URL: "attacker@voltgear-admin-release.vercel.app",
    }), false);
    assert.equal(isAllowedAdminDeleteOrigin("http://localhost:3001", production), false);
  });

  it("keeps direct localhost development working", () => {
    assert.equal(isAllowedAdminDeleteOrigin("http://localhost:3001", { NODE_ENV: "development" }), true);
    assert.equal(isAllowedAdminDeleteOrigin("http://evil.example", { NODE_ENV: "development" }), false);
  });
});
