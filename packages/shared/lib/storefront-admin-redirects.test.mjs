import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectedAdminRedirectDestination } from "./storefront-admin-redirects.mjs";
import {
  isAdminSameOriginMode,
  storefrontAdminRedirects,
  storefrontAdminRewrites,
} from "./storefront-admin-routing.mjs";

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

  it("skips redirects when same-origin proxy is enabled", () => {
    assert.deepEqual(
      storefrontAdminRedirects({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://buyntryy.com",
        ADMIN_PUBLIC_URL: "https://buyntryy.com",
        ADMIN_PROXY_UPSTREAM: "https://voltgear-admin-pi.vercel.app",
      }),
      [],
    );
    assert.ok(
      isAdminSameOriginMode({
        NEXT_PUBLIC_SITE_URL: "https://buyntryy.com",
        ADMIN_PUBLIC_URL: "https://buyntryy.com",
        ADMIN_PROXY_UPSTREAM: "https://voltgear-admin-pi.vercel.app",
      }),
    );
  });
});

describe("storefrontAdminRewrites", () => {
  it("proxies /admin and /api/admin when same-origin", () => {
    const env = {
      NEXT_PUBLIC_SITE_URL: "https://buyntryy.com",
      ADMIN_PUBLIC_URL: "https://buyntryy.com",
      ADMIN_PROXY_UPSTREAM: "https://voltgear-admin-pi.vercel.app/",
    };
    const rules = storefrontAdminRewrites(env);
    assert.ok(rules.some((r) => r.source === "/admin/:path*"));
    assert.ok(
      rules.some(
        (r) =>
          r.destination ===
          "https://voltgear-admin-pi.vercel.app/api/admin/:path*",
      ),
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
