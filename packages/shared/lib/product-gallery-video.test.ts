import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { galleryVideoForProduct, optimizeCloudinaryVideoUrl } from "./product-gallery-video";

describe("optimizeCloudinaryVideoUrl", () => {
  it("adds a transform to a plain Cloudinary video URL", () => {
    assert.equal(
      optimizeCloudinaryVideoUrl("https://res.cloudinary.com/demo/video/upload/v123/clip.mp4"),
      "https://res.cloudinary.com/demo/video/upload/q_auto,w_720,c_limit/v123/clip.mp4",
    );
  });
  it("leaves an existing transform and other hosts alone", () => {
    const withT = "https://res.cloudinary.com/demo/video/upload/q_auto/v1/clip.mp4";
    assert.equal(optimizeCloudinaryVideoUrl(withT), withT);
    assert.equal(optimizeCloudinaryVideoUrl("https://cdn.example.com/a.mp4"), "https://cdn.example.com/a.mp4");
  });
});

describe("galleryVideoForProduct", () => {
  it("returns null when there is no video", () => {
    assert.equal(galleryVideoForProduct({}), null);
  });
  it("returns an embed for an Instagram or TikTok link", () => {
    assert.deepEqual(galleryVideoForProduct({ instagramUrl: "https://www.instagram.com/reel/abc123/" }), {
      kind: "instagram",
      src: "https://www.instagram.com/reel/abc123/embed",
      poster: undefined,
      openHref: "https://www.instagram.com/reel/abc123/",
    });
    assert.equal(galleryVideoForProduct({ tiktokUrl: "https://www.tiktok.com/@shop/video/123" })?.kind, "tiktok");
  });
  it("returns the file and poster for an uploaded MP4", () => {
    assert.deepEqual(
      galleryVideoForProduct({ productVideo: { url: "https://cdn.example.com/a.mp4", poster: "https://cdn.example.com/p.jpg" } }),
      { kind: "file", src: "https://cdn.example.com/a.mp4", poster: "https://cdn.example.com/p.jpg" },
    );
  });
});
