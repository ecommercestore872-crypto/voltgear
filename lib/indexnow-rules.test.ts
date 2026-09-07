import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BUY_N_TRY_INDEXNOW_KEY,
  buildIndexNowPayload,
  indexNowEndpoint,
  isValidIndexNowKey,
  normalizeIndexNowUrls,
  priorityIndexNowPaths,
  resolveIndexNowKey,
} from "./indexnow-rules";

describe("isValidIndexNowKey", () => {
  it("accepts IndexNow key charset and length", () => {
    assert.equal(isValidIndexNowKey(BUY_N_TRY_INDEXNOW_KEY), true);
    assert.equal(isValidIndexNowKey("abc"), false);
    assert.equal(isValidIndexNowKey("bad_key!"), false);
  });
});

describe("resolveIndexNowKey", () => {
  it("uses env when valid, otherwise the Buy n Try key", () => {
    assert.equal(resolveIndexNowKey({ INDEXNOW_KEY: "abcdef12" }), "abcdef12");
    assert.equal(resolveIndexNowKey({ INDEXNOW_KEY: "nope" }), BUY_N_TRY_INDEXNOW_KEY);
  });
});

describe("normalizeIndexNowUrls", () => {
  it("keeps only same-host https urls and de-dupes", () => {
    const urls = normalizeIndexNowUrls({
      host: "buyntryy.com",
      urls: [
        "https://buyntryy.com/products/charger",
        "https://buyntryy.com/products/charger",
        "https://evil.example/x",
        "/blog",
        "https://buyntryy.com/blog/best-tws-earbuds-pakistan-2026",
      ],
    });
    assert.deepEqual(urls, [
      "https://buyntryy.com/products/charger",
      "https://buyntryy.com/blog",
      "https://buyntryy.com/blog/best-tws-earbuds-pakistan-2026",
    ]);
  });
});

describe("buildIndexNowPayload", () => {
  it("builds the official IndexNow JSON body with root keyLocation", () => {
    const body = buildIndexNowPayload({
      siteUrl: "https://buyntryy.com",
      urls: ["https://buyntryy.com/", "https://buyntryy.com/products"],
    });
    assert.equal(body.host, "buyntryy.com");
    assert.equal(body.key, BUY_N_TRY_INDEXNOW_KEY);
    assert.equal(body.keyLocation, `https://buyntryy.com/${BUY_N_TRY_INDEXNOW_KEY}.txt`);
    assert.equal(body.urlList.length, 2);
    assert.equal(indexNowEndpoint(), "https://api.indexnow.org/indexnow");
  });
});

describe("priorityIndexNowPaths", () => {
  it("includes home, shop, categories, and blog hubs", () => {
    const paths = priorityIndexNowPaths({
      categorySlugs: ["charger", "earbuds"],
      blogSlugs: ["best-tws-earbuds-pakistan-2026"],
    });
    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/products"));
    assert.ok(paths.includes("/products/charger"));
    assert.ok(paths.includes("/blog/best-tws-earbuds-pakistan-2026"));
  });
});
