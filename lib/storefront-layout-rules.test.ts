import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chromeMode,
  isAdminLoginPath,
  needsStorefrontChrome,
  pathnameFromHeaders,
} from "./storefront-layout-rules";

describe("needsStorefrontChrome", () => {
  it("loads shop chrome on the live shop, not on admin", () => {
    assert.equal(needsStorefrontChrome("/"), true);
    assert.equal(needsStorefrontChrome("/product/pad"), true);
    assert.equal(needsStorefrontChrome("/admin"), false);
    assert.equal(needsStorefrontChrome("/admin/analytics"), false);
    assert.equal(needsStorefrontChrome("/admin/login"), false);
  });
});

describe("chromeMode", () => {
  it("picks admin, gadget, or shop from the path", () => {
    assert.equal(chromeMode("/admin/orders"), "admin");
    assert.equal(chromeMode("/"), "gadget");
    assert.equal(chromeMode("/home2"), "gadget");
    assert.equal(chromeMode("/products2"), "gadget");
    assert.equal(chromeMode("/collections/summer"), "gadget");
    assert.equal(chromeMode("/product/pad"), "gadget");
  });
});

describe("isAdminLoginPath", () => {
  it("is only the admin login route", () => {
    assert.equal(isAdminLoginPath("/admin/login"), true);
    assert.equal(isAdminLoginPath("/admin"), false);
    assert.equal(isAdminLoginPath("/admin/analytics"), false);
  });
});

describe("pathnameFromHeaders", () => {
  it("prefers x-pathname, then next-url, and does not guess from an empty header", () => {
    assert.equal(pathnameFromHeaders({ "x-pathname": "/admin" }), "/admin");
    assert.equal(
      pathnameFromHeaders({ "next-url": "https://voltgear-coral.vercel.app/admin/analytics" }),
      "/admin/analytics"
    );
    assert.equal(pathnameFromHeaders({ "next-url": "/admin/orders" }), "/admin/orders");
    assert.equal(pathnameFromHeaders({}), "");
  });
});
