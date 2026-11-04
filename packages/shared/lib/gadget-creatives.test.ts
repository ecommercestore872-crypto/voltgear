import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GADGET_CREATIVES,
  gadgetDemoHeroBanners,
  gadgetLifestyleFeatureImage,
} from "./gadget-creatives";

describe("gadget-creatives", () => {
  it("exposes local webp campaign paths", () => {
    for (const url of Object.values(GADGET_CREATIVES)) {
      assert.match(url, /^\/gadget\/.+\.webp$/);
    }
  });

  it("builds four collection banners with working category hrefs", () => {
    const banners = gadgetDemoHeroBanners((slug) => `/products/${slug}`);
    assert.equal(banners.length, 4);
    assert.ok(banners.every((b) => b.imageUrl.startsWith("/gadget/")));
    assert.equal(banners[0].href, "/products/");
    assert.equal(banners[0].title, "More than gadgets.");
    assert.equal(banners[0].eyebrow, "Campaign concept · illustrative products");
    assert.equal(banners[1].href, "/products/earbuds");
    assert.equal(banners[3].href, "/products/smartwatch");
  });

  it("prefers admin slide image over lifestyle flatlay", () => {
    assert.equal(
      gadgetLifestyleFeatureImage("https://cdn.example/slide.jpg"),
      "https://cdn.example/slide.jpg"
    );
    assert.equal(gadgetLifestyleFeatureImage(""), GADGET_CREATIVES.lifestyleFlatlay);
    assert.equal(gadgetLifestyleFeatureImage(null), GADGET_CREATIVES.lifestyleFlatlay);
  });
});
