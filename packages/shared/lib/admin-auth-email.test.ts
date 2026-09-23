import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminAuthEmailAllowlist,
  adminPasswordResetRedirectUrl,
  isAllowedAdminAuthEmail,
  normalizeAdminEmail,
} from "./admin-auth-email";

describe("admin auth email", () => {
  it("defaults to the store owner email", () => {
    assert.deepEqual(adminAuthEmailAllowlist({}), ["alyabbas101@gmail.com"]);
    assert.equal(isAllowedAdminAuthEmail("alyabbas101@gmail.com", {}), true);
    assert.equal(isAllowedAdminAuthEmail("other@example.com", {}), false);
  });

  it("normalizes and reads ADMIN_AUTH_EMAILS", () => {
    assert.equal(normalizeAdminEmail("  Foo@Bar.COM "), "foo@bar.com");
    assert.deepEqual(
      adminAuthEmailAllowlist({ ADMIN_AUTH_EMAILS: "a@x.com, B@y.com" }),
      ["a@x.com", "b@y.com"],
    );
  });

  it("builds reset redirect from public site URL", () => {
    assert.equal(
      adminPasswordResetRedirectUrl({ NEXT_PUBLIC_SITE_URL: "https://buyntryy.com" }),
      "https://buyntryy.com/admin/reset-password",
    );
  });
});