import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAdminRequest } from "./admin";
import { isAdminApiPublicPath } from "./admin-api-public-paths";
import { deriveAdminSessionToken } from "./admin-session";
import { isQuickActionStatus, resolveActionSecret } from "./crypto-actions";

describe("admin authentication boundaries", () => {
  it("derives an opaque deterministic session token in every runtime", () => {
    const secret = "a-long-test-admin-secret";
    const session = deriveAdminSessionToken(secret);
    assert.equal(session, deriveAdminSessionToken(secret));
    assert.notEqual(session, secret);
  });

  it("accepts the opaque cookie or bearer secret and rejects raw-secret cookies", () => {
    const previous = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "test-admin-secret";
    try {
      const session = deriveAdminSessionToken("test-admin-secret");
      assert.equal(isAdminRequest(new Request("https://example.test", { headers: { cookie: `vg_admin=${session}` } })), true);
      assert.equal(isAdminRequest(new Request("https://example.test", { headers: { authorization: "Bearer test-admin-secret" } })), true);
      assert.equal(isAdminRequest(new Request("https://example.test", { headers: { cookie: "vg_admin=test-admin-secret" } })), false);
      assert.equal(isAdminRequest(new Request("https://example.test", { headers: { cookie: "vg_admin=%E0%A4%A" } })), false);
    } finally {
      if (previous === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = previous;
    }
  });

  it("requires an exact browser origin for cookie mutations, not bearer integrations", () => {
    const previous = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "test-admin-secret";
    try {
      const cookie = `vg_admin=${deriveAdminSessionToken("test-admin-secret")}`;
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        for (const origin of [undefined, "null", "https://hostile.example.test", "http://admin.example.test"]) {
          const headers: Record<string, string> = { cookie, "content-type": "text/plain" };
          if (origin) headers.origin = origin;
          assert.equal(isAdminRequest(new Request("https://admin.example.test/api/admin/settings", { method, headers })), false);
        }
        assert.equal(isAdminRequest(new Request("https://admin.example.test/api/admin/settings", {
          method, headers: { cookie, origin: "https://admin.example.test" },
        })), true);
        assert.equal(isAdminRequest(new Request("https://admin.example.test/api/admin/settings", {
          method, headers: { authorization: "Bearer test-admin-secret" },
        })), true);
      }
    } finally {
      if (previous === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = previous;
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
