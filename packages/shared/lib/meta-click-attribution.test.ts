import assert from "node:assert/strict";
import { test } from "node:test";
import { captureClickAttribution } from "./click-attribution";
import { captureMetaClick, persistMetaClick } from "./meta-click-attribution";
import { META_PRODUCTION_PIXEL_ID } from "./meta-commerce";

test("relative storefront URLs preserve original advertising click identifiers", () => {
  assert.deepEqual(captureClickAttribution("/product/buds?fbclid=CLICK_123&ttclid=TT123&utm_source=meta"),
    { fbclid: "CLICK_123", ttclid: "TT123", utm_source: "meta" });
});

test("fbc uses the real click timestamp only after consent and never invents a click", () => {
  const keys = ["window", "document"];
  const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  const oldEnv = { ...process.env };
  let consent = "essential";
  const browser = { location: { hostname: "buyntryy.com", pathname: "/product/buds", search: "", hash: "" }, navigator: {},
    localStorage: { getItem: () => consent }, __META_PENDING_CLICK__: undefined as { id: string; at: number } | undefined };
  const doc = { cookie: "" };
  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = META_PRODUCTION_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_TEST_MODE;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
    captureMetaClick("/product/buds?fbclid=CLICK_123");
    const at = browser.__META_PENDING_CLICK__!.at;
    assert.equal(doc.cookie, "");
    consent = "all";
    persistMetaClick();
    assert.match(doc.cookie, new RegExp(`^_fbc=fb\\.1\\.${at}\\.CLICK_123;`));
    assert.match(doc.cookie, /SameSite=Lax; Secure/);
    assert.equal(browser.__META_PENDING_CLICK__, undefined);
    doc.cookie = "";
    captureMetaClick("/product/buds");
    assert.equal(doc.cookie, "");
    captureMetaClick("/product/buds?fbclid=invalid%20value");
    assert.equal(doc.cookie, "");
  } finally {
    keys.forEach((key, i) => { if (descriptors[i]) Object.defineProperty(globalThis, key, descriptors[i]!); else Reflect.deleteProperty(globalThis, key); });
    for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});
