import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  expectedAdminRedirectDestination,
  storefrontAdminRedirects,
} from "./storefront-admin-redirects.mjs";

describe("storefrontAdminRedirects", () => {
  it("maps /admin and /studio when ADMIN_PUBLIC_URL is set", () => {
    const rules = storefrontAdminRedirects({
      ADMIN_PUBLIC_URL: "https://voltgear-admin-dashboard.vercel.app/",
      NODE_ENV: "production",
    });
    assert.equal(rules.length, 3);
    assert.deepEqual(rules[0], {
      source: "/admin",
      destination: "https://voltgear-admin-dashboard.vercel.app/admin",
      permanent: false,
    });
    assert.equal(
      rules[2].destination,
      "https://voltgear-admin-dashboard.vercel.app/admin/login",
    );
  });

  it("uses localhost admin in non-production when URL unset", () => {
    const rules = storefrontAdminRedirects({ NODE_ENV: "development" });
    assert.ok(rules[0].destination.startsWith("http://localhost:3001"));
  });

  it("returns no admin redirects in production without ADMIN_PUBLIC_URL", () => {
    assert.deepEqual(
      storefrontAdminRedirects({ NODE_ENV: "production" }),
      [],
    );
  });
});

describe("expectedAdminRedirectDestination", () => {
  const admin = "https://voltgear-admin-dashboard.vercel.app";
  const shop = "https://buyntryy.com";

  it("matches T-40 smoke paths", () => {
    assert.equal(
      expectedAdminRedirectDestination(shop, admin, "/admin"),
      `${admin}/admin`,
    );
    assert.equal(
      expectedAdminRedirectDestination(shop, admin, "/admin/login"),
      `${admin}/admin/login`,
    );
    assert.equal(
      expectedAdminRedirectDestination(shop, admin, "/studio"),
      `${admin}/admin/login`,
    );
  });
});
