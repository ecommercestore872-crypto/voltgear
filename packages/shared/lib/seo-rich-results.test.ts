import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { indexablePaths } from "./indexnow-rules";
import {
  organizationStructuredData,
  productStructuredData,
  resolveOrgLogoUrl,
} from "./seo-rules";

// Fixtures mirror what Google's Rich Results Test requires for Product + Merchant listing + Organization.
const PRODUCT = {
  name: "Airbuds Pro",
  description: "Wireless earbuds",
  url: "https://buyntryy.com/product/airbuds-pro",
  image: "https://buyntryy.com/a.webp",
  price: 3850,
  inStock: true,
  shippingFee: 199,
  returnDays: 7,
};

type Offer = {
  "@type": string;
  price: string;
  priceCurrency: string;
  availability: string;
  shippingDetails?: { shippingRate: { value: string; currency: string }; shippingDestination: { addressCountry: string } };
  hasMerchantReturnPolicy?: Record<string, unknown>;
};

describe("Product JSON-LD (Rich Results fixtures)", () => {
  it("has required Product + Offer fields in PKR", () => {
    const d = productStructuredData(PRODUCT);
    assert.equal(d["@context"], "https://schema.org");
    assert.equal(d["@type"], "Product");
    for (const f of ["name", "image", "offers"]) assert.ok(d[f], f);
    const o = d.offers as Offer;
    assert.equal(o["@type"], "Offer");
    assert.equal(o.price, "3850");
    assert.equal(o.priceCurrency, "PKR");
    assert.equal(o.availability, "https://schema.org/InStock");
  });

  it("emits shippingDetails and hasMerchantReturnPolicy only from real settings", () => {
    const o = productStructuredData(PRODUCT).offers as Offer;
    assert.equal(o.shippingDetails?.shippingRate.currency, "PKR");
    assert.equal(o.shippingDetails?.shippingDestination.addressCountry, "PK");
    assert.equal(o.hasMerchantReturnPolicy?.merchantReturnDays, 7);
    assert.equal("returnFees" in (o.hasMerchantReturnPolicy ?? {}), false);
    assert.equal("returnMethod" in (o.hasMerchantReturnPolicy ?? {}), false);

    const bare = productStructuredData({ ...PRODUCT, shippingFee: undefined, returnDays: undefined }).offers as Offer;
    assert.equal(bare.shippingDetails, undefined);
    assert.equal(bare.hasMerchantReturnPolicy, undefined);
  });

  it("free shipping is a real 0 rate, out of stock maps to OutOfStock", () => {
    const o = productStructuredData({ ...PRODUCT, shippingFee: 0, inStock: false }).offers as Offer;
    assert.equal(o.shippingDetails?.shippingRate.value, "0");
    assert.equal(o.availability, "https://schema.org/OutOfStock");
  });

  it("never invents aggregateRating", () => {
    assert.equal("aggregateRating" in productStructuredData(PRODUCT), false);
    assert.equal("aggregateRating" in productStructuredData({ ...PRODUCT, rating: 5, reviewCount: 0 }), false);
    assert.equal("aggregateRating" in productStructuredData({ ...PRODUCT, reviewCount: 3 }), false);
    const d = productStructuredData({ ...PRODUCT, rating: 4.5, reviewCount: 12 });
    assert.deepEqual(d.aggregateRating, {
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 12,
      bestRating: 5,
    });
  });

  it("brand is the manufacturer only; the store is the seller", () => {
    assert.equal("brand" in productStructuredData(PRODUCT), false);
    const d = productStructuredData({ ...PRODUCT, brand: "Monster", sellerName: "Buy n Try" });
    assert.equal(d.brand?.name, "Monster");
    assert.equal((d.offers as { seller: { name: string } }).seller.name, "Buy n Try");
  });
});

describe("Organization JSON-LD", () => {
  const org = organizationStructuredData({
    siteUrl: "https://buyntryy.com",
    brandName: "Buy n Try",
    phone: "+920000000000",
    email: "hello@buyntryy.com",
    sameAs: ["https://www.instagram.com/buyntry_/", "https://www.facebook.com/buyntryy", "https://www.tiktok.com/@buyntryy_"],
  });

  it("has logo, contactPoint and sameAs", () => {
    assert.equal(org.logo, "https://buyntryy.com/brand/bnt-seal-192.webp");
    const cp = org.contactPoint as Record<string, string>;
    assert.equal(cp["@type"], "ContactPoint");
    assert.equal(cp.telephone, "+920000000000");
    assert.equal(cp.email, "hello@buyntryy.com");
    assert.equal((org.sameAs as string[]).length, 3);
    assert.ok((org.sameAs as string[])[0].includes("instagram.com/buyntry_"));
  });

  it("omits contactPoint and sameAs when there is nothing real to say", () => {
    const o = organizationStructuredData({ siteUrl: "https://buyntryy.com", brandName: "Buy n Try" });
    assert.equal("contactPoint" in o, false);
    assert.equal("sameAs" in o, false);
  });

  it("resolves logo URLs", () => {
    const site = "https://buyntryy.com";
    assert.equal(resolveOrgLogoUrl("https://res.cloudinary.com/x.png", site), "https://res.cloudinary.com/x.png");
    assert.equal(resolveOrgLogoUrl("/logo.png", site), "https://buyntryy.com/logo.png");
    assert.equal(resolveOrgLogoUrl("  ", site), "https://buyntryy.com/brand/bnt-seal-192.webp");
  });
});

describe("IndexNow path filter", () => {
  it("drops paths robots.txt blocks", () => {
    assert.deepEqual(
      indexablePaths(["/", "/product/a", "/products/earbuds", "/api/store/products", "/search", "/admin/products", "/cart", "/checkout/x"]),
      ["/", "/product/a", "/products/earbuds"],
    );
  });
});
