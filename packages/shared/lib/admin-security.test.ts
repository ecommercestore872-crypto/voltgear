import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminActorId, isAdminRequest } from "./admin";
import { isAdminApiPublicPath } from "./admin-api-public-paths";
import { createAdminActorSession, deriveAdminSessionToken, verifyAdminActorSession } from "./admin-session";
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

  it("requires a signed, unexpired named identity for audited deletion", () => {
    const previous = process.env.ADMIN_TOKEN;
    const secret = "test-admin-secret";
    const userId = "d9208990-9e44-4107-a3c7-48bceffeb020";
    const now = Date.UTC(2026, 10, 11);
    process.env.ADMIN_TOKEN = secret;
    try {
      const session = deriveAdminSessionToken(secret);
      const actor = createAdminActorSession(secret, userId, now);
      const request = (cookie: string) => new Request("https://example.test", { headers: { cookie } });
      assert.equal(verifyAdminActorSession(secret, actor, now), userId);
      assert.equal(verifyAdminActorSession(secret, actor.replace(userId, "a9208990-9e44-4107-a3c7-48bceffeb020"), now), null);
      assert.equal(verifyAdminActorSession(secret, actor, now + 8 * 24 * 60 * 60 * 1000), null);
      const freshActor = createAdminActorSession(secret, userId);
      assert.equal(adminActorId(request(`vg_admin=${session}; vg_admin_actor=${freshActor}`)), userId);
      assert.equal(adminActorId(request(`vg_admin=${session}`)), null);
      assert.equal(adminActorId(request(`vg_admin=wrong; vg_admin_actor=${freshActor}`)), null);
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
