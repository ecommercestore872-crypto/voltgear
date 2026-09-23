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

  it("builds three demo hero banners with category hrefs", () => {
    const banners = gadgetDemoHeroBanners((slug) => `/products2/${slug}`);
    assert.equal(banners.length, 3);
    assert.ok(banners.every((b) => b.imageUrl.startsWith("/gadget/")));
    assert.equal(banners[0].href, "/products2/earbuds");
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
