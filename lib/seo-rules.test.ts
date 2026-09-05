import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CANONICAL_PUBLIC_ORIGIN,
  categorySearchMeta,
  categoryStructuredData,
  indexSiteUrl,
  llmsTxt,
  organizationStructuredData,
  productStructuredData,
} from "./seo-rules";

describe("indexSiteUrl", () => {
  it("uses buyntryy.com when the app is on localhost", () => {
    assert.equal(indexSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }), CANONICAL_PUBLIC_ORIGIN);
    assert.equal(CANONICAL_PUBLIC_ORIGIN, "https://buyntryy.com");
  });

  it("keeps a real public origin", () => {
    assert.equal(indexSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://buyntryy.com/" }), "https://buyntryy.com");
  });
});

describe("categorySearchMeta", () => {
  it("names earbuds so airbuds searches can match", () => {
    const meta = categorySearchMeta({
      slug: "earbuds",
      name: "Earbuds & Handsfree",
      description: "Immersive sound. All-day comfort.",
    });
    assert.match(meta.title, /Earbuds/i);
    assert.match(meta.title, /Buy n Try/);
    assert.match(meta.description, /airbuds/i);
    assert.match(meta.description, /buyntryy\.com/);
    assert.ok(meta.keywords.includes("airbuds"));
  });
});

describe("productStructuredData", () => {
  it("emits a Product offer Google can read, without inventing a barcode", () => {
    const data = productStructuredData({
      name: "Studio Max",
      description: "Wireless earbuds",
      url: "https://buyntryy.com/product/studio-max",
      image: "https://buyntryy.com/img.webp",
      category: "earbuds",
      price: 4999,
      currency: "PKR",
      inStock: true,
      sku: "SM-1",
      brandName: "Buy n Try",
    });
    assert.equal(data["@type"], "Product");
    assert.equal(data.brand.name, "Buy n Try");
    assert.equal(data.offers.price, 4999);
    assert.equal(data.offers.priceCurrency, "PKR");
    assert.equal(data.offers.availability, "https://schema.org/InStock");
    assert.equal("gtin" in data, false);
    assert.equal(data.sku, "SM-1");
  });
});

describe("categoryStructuredData", () => {
  it("lists products as an ItemList on the category page", () => {
    const data = categoryStructuredData({
      siteUrl: "https://buyntryy.com",
      name: "Earbuds",
      path: "/products/earbuds",
      items: [{ name: "Studio Max", path: "/product/studio-max" }],
    });
    assert.equal(data.collection["@type"], "CollectionPage");
    assert.equal(data.itemList.numberOfItems, 1);
    assert.equal(data.itemList.itemListElement[0].url, "https://buyntryy.com/product/studio-max");
  });
});

describe("organizationStructuredData", () => {
  it("names Buy n Try and buyntryy on the same store", () => {
    const data = organizationStructuredData({
      siteUrl: "https://buyntryy.com",
      brandName: "Buy n Try",
      phone: "+923090333107",
    });
    assert.equal(data.name, "Buy n Try");
    assert.ok(data.alternateName.includes("buyntryy"));
    assert.equal(data.url, "https://buyntryy.com");
  });
});

describe("llmsTxt", () => {
  it("tells AI assistants the store name, domain, and category links", () => {
    const text = llmsTxt({
      siteUrl: "https://buyntryy.com",
      brandName: "Buy n Try",
      categories: [{ name: "Earbuds & Handsfree", path: "/products/earbuds" }],
    });
    assert.match(text, /Buy n Try/);
    assert.match(text, /buyntryy\.com/);
    assert.match(text, /\/products\/earbuds/);
  });
});
