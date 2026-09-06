import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cloudinaryImageUrl } from "./cloudinary";

describe("cloudinaryImageUrl", () => {
  it("limits width without stretching a small original", () => {
    const src =
      "https://res.cloudinary.com/demo/image/upload/v1/folder/watch.jpg";
    const url = cloudinaryImageUrl(src, { w: 2000 });
    assert.match(url, /c_limit,w_2000/);
    assert.match(url, /f_auto,q_auto/);
  });

  it("leaves files that already live on this site alone", () => {
    const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "t5evppnl";
    try {
      assert.equal(
        cloudinaryImageUrl("/gadget/gadget-hero-audio.webp", { w: 1200 }),
        "/gadget/gadget-hero-audio.webp"
      );
      assert.equal(cloudinaryImageUrl("/brand/bnt-seal.png"), "/brand/bnt-seal.png");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      else process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev;
    }
  });
});
