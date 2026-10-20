import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { siteStaticImageUrl } from "./site-static-image";

describe("siteStaticImageUrl", () => {
  it("returns local path when Cloudinary is not configured", () => {
    const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    assert.equal(siteStaticImageUrl("/categories/charger.webp", { w: 256 }), "/categories/charger.webp");
    if (prev) process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev;
  });

  it("keeps pre-optimized gadget and brand artwork on the first-party origin", () => {
    const prevCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo";
    try {
      assert.equal(
        siteStaticImageUrl("/gadget/products/prod-powercore-30k-max.webp", {
          w: 256,
        }),
        "/gadget/products/prod-powercore-30k-max.webp",
      );
      assert.equal(
        siteStaticImageUrl("/brand/bnt-seal.webp", { w: 192 }),
        "/brand/bnt-seal.webp",
      );
    } finally {
      if (prevCloud === undefined) {
        delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      } else {
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prevCloud;
      }
    }
  });
});
