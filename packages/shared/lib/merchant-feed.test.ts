import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { feedBrand, isReplicaListing, merchantItemXml, xmlEscape } from "./merchant-feed";

const base = {
  _id: "p1",
  name: "Baseus 20000mAh Power Bank",
  slug: "baseus-20000",
  brand: "Baseus",
  category: "power-bank",
  price: 5999,
  stockStatus: "in-stock",
};

describe("merchant feed", () => {
  it("escapes XML so an ampersand in a title or image URL cannot break the feed", () => {
    assert.equal(xmlEscape("A & B <x>"), "A &amp; B &lt;x&gt;");
    const xml = merchantItemXml({ ...base, name: "Buds & Case" }, "https://x/p", "https://i/a.jpg?w=1&h=2");
    assert.ok(xml?.includes("Buds &amp; Case"));
    assert.ok(xml?.includes("w=1&amp;h=2"));
  });

  it("uses the real brand, never the store or old store name", () => {
    assert.equal(feedBrand("Baseus"), "Baseus");
    assert.equal(feedBrand("VoltGear Audio"), undefined);
    assert.equal(feedBrand("Buy n Try"), undefined);
    const xml = merchantItemXml({ ...base, brand: "VoltGear Audio" }, "https://x/p", "https://i/a.jpg");
    assert.ok(xml?.includes("<g:identifier_exists>no</g:identifier_exists>"));
    assert.ok(!xml?.includes("<g:brand>"));
  });

  it("leaves out replica listings, zero prices and items without an image", () => {
    assert.equal(isReplicaListing({ name: "Apple Airpods Pro 3 ANC", brand: "Master Copy" }), true);
    assert.equal(isReplicaListing({ name: "SR11 Apple Logo AMOLED Smartwatch" }), true);
    assert.equal(isReplicaListing({ name: "Silicone Case for Apple AirPods Pro 2" }), false);
    assert.equal(merchantItemXml({ ...base, name: "Apple Airpods Pro 3" }, "https://x/p", "https://i/a.jpg"), null);
    assert.equal(merchantItemXml({ ...base, price: 0 }, "https://x/p", "https://i/a.jpg"), null);
    assert.equal(merchantItemXml(base, "https://x/p", undefined), null);
  });

  it("marks out-of-stock and formats the price", () => {
    const xml = merchantItemXml({ ...base, stockStatus: "out-of-stock" }, "https://x/p", "https://i/a.jpg");
    assert.ok(xml?.includes("out of stock"));
    assert.ok(xml?.includes("5999.00 PKR"));
  });
});
