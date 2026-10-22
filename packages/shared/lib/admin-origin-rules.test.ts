import assert from "node:assert/strict";
import { it } from "node:test";
import { isTrustedAdminMutationOrigin } from "./admin-origin-rules";

const request = (origin?: string, extra: Record<string, string> = {}) => new Request("https://admin.example.test/api/admin/orders", {
  method: "POST", headers: { ...(origin ? { origin } : {}), ...extra },
});

it("supports the direct admin host and explicitly configured storefront rewrite", () => {
  assert.equal(isTrustedAdminMutationOrigin(request("https://admin.example.test"), {}), true);
  assert.equal(isTrustedAdminMutationOrigin(request("https://shop.example.test"), { ADMIN_PUBLIC_URL: "https://shop.example.test" }), true);
  assert.equal(isTrustedAdminMutationOrigin(request("https://shop.example.test"), { ADMIN_SAME_ORIGIN: "1", NEXT_PUBLIC_SITE_URL: "https://shop.example.test" }), true);
  assert.equal(isTrustedAdminMutationOrigin(request("https://shop.example.test"), { NEXT_PUBLIC_SITE_URL: "https://shop.example.test" }), false);
});

it("rejects missing, opaque, sibling, lookalike and forged forwarded origins", () => {
  const env = { ADMIN_PUBLIC_URL: "https://shop.example.test" };
  for (const origin of [undefined, "null", "https://other.example.test", "https://shop.example.test.evil.test", "http://shop.example.test"]) {
    assert.equal(isTrustedAdminMutationOrigin(request(origin, { "x-forwarded-host": "shop.example.test" }), env), false);
  }
});

it("does not broaden trust on invalid configuration", () => {
  for (const value of ["not a URL", "javascript:alert(1)", "*", "https://user:password@shop.example.test"]) {
    assert.equal(isTrustedAdminMutationOrigin(request("https://shop.example.test"), { ADMIN_PUBLIC_URL: value }), false);
  }
  assert.equal(isTrustedAdminMutationOrigin(request("https://fallback.example.test"), {
    ADMIN_PUBLIC_URL: "https://shop.example.test", NEXT_PUBLIC_SITE_URL: "https://fallback.example.test",
  }), false);
});
