import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cloudinaryAssetPathAfterUpload,
  cloudinaryImageUrl,
  cloudinaryLoader,
} from "./cloudinary";

describe("cloudinaryImageUrl", () => {
  it("limits width without stretching a small original", () => {
    const src =
      "https://res.cloudinary.com/demo/image/upload/v1/folder/watch.jpg";
    const url = cloudinaryImageUrl(src, { w: 2000 });
    assert.match(url, /c_limit,w_2000/);
    assert.match(url, /f_webp,q_auto/);
  });

  it("replaces an existing transform segment instead of stacking", () => {
    const src =
      "https://res.cloudinary.com/demo/image/upload/f_webp,q_auto,c_limit,w_900/v1/folder/watch.jpg";
    const url = cloudinaryImageUrl(src, { w: 640 });
    assert.match(url, /c_limit,w_640/);
    assert.doesNotMatch(url, /w_900/);
  });

  it("cloudinaryLoader applies requested width", () => {
    const src =
      "https://res.cloudinary.com/demo/image/upload/v1/folder/watch.jpg";
    const out = cloudinaryLoader({ src, width: 640, quality: 75 });
    assert.match(out, /w_640/);
  });

  it("strips transform segments from upload tail", () => {
    assert.equal(
      cloudinaryAssetPathAfterUpload("f_auto,q_60,w_800/folder/x.webp"),
      "folder/x.webp",
    );
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
