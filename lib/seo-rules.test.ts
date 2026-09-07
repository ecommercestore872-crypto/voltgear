import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CANONICAL_PUBLIC_ORIGIN,
  SEARCH_CRAWL_DISALLOW,
  apexPublicUrl,
  brandSearchAliases,
  categoryHubCopy,
  categoryRelatedGuide,
  categorySearchMeta,
  categoryStructuredData,
  indexSiteUrl,
  llmsTxt,
  organizationStructuredData,
  productStructuredData,
  shopCatalogSearchMeta,
  shouldRedirectWwwHost,
  storeAlternatesLanguages,
  websiteStructuredData,
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
    assert.match(meta.title, /Pakistan/i);
    assert.match(meta.title, /Buy n Try/);
    assert.match(meta.description, /airbuds/i);
    assert.match(meta.description, /cash on delivery/i);
    assert.match(meta.description, /buyntryy\.com/);
    assert.ok(meta.keywords.includes("airbuds"));
    assert.ok(meta.keywords.includes("buyntry"));
  });

  it("covers adapters, selfie sticks, and dedicated tripod hubs", () => {
    const charger = categorySearchMeta({
      slug: "charger",
      name: "Chargers & Adapters",
    });
    assert.ok(charger.keywords.includes("adapters"));
    assert.ok(charger.keywords.includes("GaN charger"));
    assert.match(charger.title, /Adapters|Chargers/);

    const sticks = categorySearchMeta({
      slug: "selfie-stick",
      name: "Selfie Sticks",
    });
    assert.ok(sticks.keywords.includes("selfie stick"));
    assert.equal(sticks.keywords.includes("tripod"), false);

    const tripods = categorySearchMeta({
      slug: "tripod",
      name: "Tripods & Stands",
    });
    assert.ok(tripods.keywords.includes("tripod"));
    assert.ok(tripods.keywords.includes("camera tripod"));
  });
});

describe("categoryHubCopy", () => {
  it("writes a Pakistan shopping intro for category landings", () => {
    const copy = categoryHubCopy({
      slug: "charger",
      name: "Chargers & Adapters",
    });
    assert.match(copy, /Pakistan/i);
    assert.match(copy, /adapter|charger/i);
    assert.match(copy, /Buy n Try|buyntryy/i);
    assert.ok(copy.length >= 80);
    assert.ok(copy.length <= 320);
  });
});

describe("brandSearchAliases", () => {
  it("lists spellings people type when looking for the store", () => {
    const aliases = brandSearchAliases();
    for (const name of ["Buy n Try", "buyntry", "buyntryy", "buy n try", "BNT"]) {
      assert.ok(aliases.includes(name), name);
    }
  });
});

describe("categoryRelatedGuide", () => {
  it("links charger and earbuds hubs to buying guides", () => {
    assert.equal(categoryRelatedGuide("charger")?.href, "/blog/65w-gan-charger-pakistan-guide");
    assert.equal(categoryRelatedGuide("earbuds")?.href, "/blog/best-tws-earbuds-pakistan-2026");
    assert.equal(categoryRelatedGuide("unknown"), null);
  });
});

describe("shopCatalogSearchMeta", () => {
  it("positions the full shop for electronics accessories in Pakistan", () => {
    const meta = shopCatalogSearchMeta();
    assert.match(meta.title, /Pakistan/i);
    assert.match(meta.title, /Buy n Try/);
    assert.match(meta.description, /cash on delivery/i);
    assert.ok(meta.keywords.includes("buyntry"));
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
    assert.equal(data.offers.price, "4999");
    assert.equal(data.offers.priceCurrency, "PKR");
    assert.equal(data.offers.availability, "https://schema.org/InStock");
    assert.equal("gtin" in data, false);
    assert.equal(data.sku, "SM-1");
  });

  it("adds Pakistan shipping and returns when those store settings exist", () => {
    const data = productStructuredData({
      name: "Studio Max",
      description: "Wireless earbuds",
      url: "https://buyntryy.com/product/studio-max",
      price: 4999,
      inStock: true,
      shippingFee: 199,
      returnDays: 7,
    });
    const offers = data.offers as {
      shippingDetails?: { shippingDestination?: { addressCountry?: string } };
      hasMerchantReturnPolicy?: { merchantReturnDays?: number };
    };
    assert.equal(offers.shippingDetails?.shippingDestination?.addressCountry, "PK");
    assert.equal(offers.hasMerchantReturnPolicy?.merchantReturnDays, 7);
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

describe("websiteStructuredData", () => {
  it("puts Buy n Try on the home URL the way Google site names expect", () => {
    const data = websiteStructuredData({
      siteUrl: "https://buyntryy.com",
      brandName: "Buy n Try",
    });
    assert.equal(data["@type"], "WebSite");
    assert.equal(data.name, "Buy n Try");
    assert.equal(data.url, "https://buyntryy.com/");
    assert.ok(data.alternateName.includes("BNT"));
    assert.ok(data.alternateName.includes("buyntryy.com"));
    assert.ok(data.alternateName.includes("buyntry"));
    assert.ok(data.alternateName.includes("buy n try"));
    assert.equal(data.potentialAction.target, "https://buyntryy.com/search?q={search_term_string}");
  });

  it("keeps Googlebot on the same crawl blocks as every other bot", () => {
    assert.ok(SEARCH_CRAWL_DISALLOW.includes("/admin/"));
    assert.ok(SEARCH_CRAWL_DISALLOW.includes("/checkout/"));
    assert.ok(SEARCH_CRAWL_DISALLOW.includes("/cart"));
    assert.ok(SEARCH_CRAWL_DISALLOW.includes("/search"));
    assert.ok(SEARCH_CRAWL_DISALLOW.includes("/track"));
    assert.equal(SEARCH_CRAWL_DISALLOW.includes("/brand/" as never), false);
  });
});

describe("shouldRedirectWwwHost", () => {
  it("forces www onto the apex host for one canonical domain", () => {
    assert.equal(shouldRedirectWwwHost("www.buyntryy.com"), true);
    assert.equal(shouldRedirectWwwHost("buyntryy.com"), false);
    assert.equal(shouldRedirectWwwHost("localhost:3000"), false);
    assert.equal(apexPublicUrl("/products/charger"), "https://buyntryy.com/products/charger");
    assert.deepEqual(storeAlternatesLanguages("/products").languages["en-PK"], "https://buyntryy.com/products");
    assert.ok(storeAlternatesLanguages("/").languages["x-default"].includes("buyntryy.com"));
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
    assert.match(text, /\/blog/);
    assert.match(text, /buyntry/i);
    assert.match(text, /adapters|chargers|earbuds/i);
    assert.match(text, /sitemap\.xml/);
    assert.match(text, /not buyntryparts/i);
  });
});
