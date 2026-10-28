import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminCookieOptions, hasValidAdminBearer, isAdminRequest } from "./admin";
import { isAdminApiPublicPath } from "./admin-api-public-paths";
import { createAdminSessionToken, hashAdminSessionToken, isAdminSessionToken } from "./admin-session";
import { isQuickActionStatus, resolveActionSecret } from "./crypto-actions";

describe("admin authentication boundaries", () => {
  it("sets bounded HttpOnly, SameSite and Secure cookies in production", () => {
    const previous = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true, writable: true, enumerable: true });
    try {
      assert.deepEqual(adminCookieOptions(), { httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 28_800 });
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else Object.defineProperty(process.env, "NODE_ENV", { value: previous, configurable: true, writable: true, enumerable: true });
    }
  });
  it("creates unique opaque credentials with 256 random bits and stores only digests", () => {
    const first = createAdminSessionToken();
    const second = createAdminSessionToken();
    assert.match(first, /^v2\.[a-f0-9]{64}$/);
    assert.notEqual(first, second);
    assert.match(hashAdminSessionToken(first), /^[a-f0-9]{64}$/);
    assert.notEqual(hashAdminSessionToken(first), first);
    assert.equal(isAdminSessionToken("f".repeat(64)), false);
    assert.equal(isAdminSessionToken("v2." + "F".repeat(64)), false);
  });

  it("preserves bearer access and rejects legacy, raw-secret and malformed cookies", async () => {
    const previous = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "test-admin-secret";
    try {
      assert.equal(await isAdminRequest(new Request("https://example.test", { headers: { cookie: `vg_admin=${"f".repeat(64)}` } })), false);
      assert.equal(await isAdminRequest(new Request("https://example.test", { headers: { authorization: "Bearer test-admin-secret" } })), true);
      assert.equal(await isAdminRequest(new Request("https://example.test", { headers: { cookie: "vg_admin=test-admin-secret" } })), false);
      assert.equal(await isAdminRequest(new Request("https://example.test", { headers: { cookie: "vg_admin=%E0%A4%A" } })), false);
      assert.equal(hasValidAdminBearer(new Request("https://example.test", { headers: { authorization: "test-admin-secret" } })), false);
      assert.equal(hasValidAdminBearer(new Request("https://example.test", { headers: { authorization: "Bearer wrong-secret" } })), false);
    } finally {
      if (previous === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = previous;
    }
  });

  it("requires an exact browser origin for cookie mutations, not bearer integrations", async () => {
    const previous = process.env.ADMIN_TOKEN;
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const previousAllowlist = process.env.ADMIN_AUTH_EMAILS;
    const previousFetch = globalThis.fetch;
    process.env.ADMIN_TOKEN = "test-admin-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://isolated.example.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
    process.env.ADMIN_AUTH_EMAILS = "admin@example.invalid";
    globalThis.fetch = async () => Response.json({ userId: "synthetic-id", email: "admin@example.invalid", expiresAt: new Date(Date.now() + 60_000).toISOString() });
    try {
      const cookie = `vg_admin=${createAdminSessionToken()}`;
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        for (const origin of [undefined, "null", "https://hostile.example.test", "http://admin.example.test"]) {
          const headers: Record<string, string> = { cookie, "content-type": "text/plain" };
          if (origin) headers.origin = origin;
          assert.equal(await isAdminRequest(new Request("https://admin.example.test/api/admin/settings", { method, headers })), false);
          assert.equal(await isAdminRequest(new Request("https://admin.example.test/api/admin/settings", { method, headers: { ...headers, authorization: "Bearer wrong-secret" } })), false);
        }
        assert.equal(await isAdminRequest(new Request("https://admin.example.test/api/admin/settings", {
          method, headers: { cookie, origin: "https://admin.example.test" },
        })), true);
        assert.equal(await isAdminRequest(new Request("https://admin.example.test/api/admin/settings", {
          method, headers: { authorization: "Bearer test-admin-secret" },
        })), true);
      }
    } finally {
      if (previous === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = previous;
      for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: previousUrl, SUPABASE_SERVICE_ROLE_KEY: previousKey, ADMIN_AUTH_EMAILS: previousAllowlist })) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      globalThis.fetch = previousFetch;
    }
  });

  it("keeps only self-authenticating endpoints public", () => {
    assert.equal(isAdminApiPublicPath("/api/admin/login"), true);
    assert.equal(isAdminApiPublicPath("/api/admin/forgot-password"), true);
    assert.equal(isAdminApiPublicPath("/api/admin/quick-action"), true);
    assert.equal(isAdminApiPublicPath("/api/admin/quick-action/anything"), false);
    assert.equal(isAdminApiPublicPath("/api/admin/logout"), false);
    assert.equal(isAdminApiPublicPath("/api/admin/demo"), false);
    assert.equal(isAdminApiPublicPath("/api/admin/update-password"), false);
  });

  it("restricts email quick actions to the two supported transitions", () => {
    assert.equal(isQuickActionStatus("shipped"), true);
    assert.equal(isQuickActionStatus("cancelled"), true);
    assert.equal(isQuickActionStatus("delivered"), false);
    assert.equal(isQuickActionStatus("refunded"), false);
  });

  it("never uses the known development action key in production", () => {
    assert.throws(() => resolveActionSecret({ NODE_ENV: "production" }), /AUTH_SECRET/);
    assert.equal(
      resolveActionSecret({ NODE_ENV: "production", ADMIN_TOKEN: "strong-secret" }),
      "strong-secret",
    );
  });
});
