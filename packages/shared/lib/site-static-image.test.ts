import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { siteStaticImageUrl } from "./site-static-image";

describe("siteStaticImageUrl", () => {
  it("returns local path when Cloudinary is not configured", () => {
    const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    assert.equal(siteStaticImageUrl("/categories/charger.png", { w: 256 }), "/categories/charger.png");
    if (prev) process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev;
  });
});
