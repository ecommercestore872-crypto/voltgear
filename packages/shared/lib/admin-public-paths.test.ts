import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAdminPublicPath } from "./admin-public-paths";

describe("isAdminPublicPath", () => {
  it("allows login and password recovery without a session", () => {
    assert.equal(isAdminPublicPath("/admin/login"), true);
    assert.equal(isAdminPublicPath("/admin/forgot-password"), true);
    assert.equal(isAdminPublicPath("/admin/reset-password"), true);
    assert.equal(isAdminPublicPath("/admin/reset-password/token-here"), true);
  });

  it("blocks protected admin routes", () => {
    assert.equal(isAdminPublicPath("/admin"), false);
    assert.equal(isAdminPublicPath("/admin/orders"), false);
    assert.equal(isAdminPublicPath("/admin/products"), false);
  });
});