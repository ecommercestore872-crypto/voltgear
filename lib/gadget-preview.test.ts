import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkoutHref,
  hasShopperProductVideo,
  isGadgetContinuityPath,
  isGadgetPreviewPath,
  product2Href,
  shouldUseGadgetChrome,
  videoEmbedSrc,
  videoKind,
} from "./gadget-preview";

describe("isGadgetPreviewPath", () => {
  it("treats live home and catalog preview routes as gadget chrome", () => {
    assert.equal(isGadgetPreviewPath("/"), true);
    assert.equal(isGadgetPreviewPath("/home2"), true);
    assert.equal(isGadgetPreviewPath("/product2/pad"), true);
    assert.equal(isGadgetPreviewPath("/products2"), true);
    assert.equal(isGadgetPreviewPath("/products2/earbuds"), true);
    assert.equal(isGadgetPreviewPath("/product/pad"), false);
    assert.equal(isGadgetPreviewPath("/products"), false);
  });
});

describe("product2Href", () => {
  it("builds the preview product URL", () => {
    assert.equal(product2Href("wireless-15w-pad"), "/product/wireless-15w-pad");
  });
});

describe("isGadgetContinuityPath", () => {
  it("covers cart, search, compare, and support pages", () => {
    assert.equal(isGadgetContinuityPath("/cart"), true);
    assert.equal(isGadgetContinuityPath("/search"), true);
    assert.equal(isGadgetContinuityPath("/compare"), true);
    assert.equal(isGadgetContinuityPath("/track"), true);
    assert.equal(isGadgetContinuityPath("/warranty"), true);
    assert.equal(isGadgetContinuityPath("/blog/tips"), true);
    assert.equal(isGadgetContinuityPath("/contact"), true);
    assert.equal(isGadgetContinuityPath("/faq"), true);
    assert.equal(isGadgetContinuityPath("/shipping-returns"), true);
    assert.equal(isGadgetContinuityPath("/products"), false);
  });
});

describe("shouldUseGadgetChrome", () => {
  it("keeps preview routes, checkout, and session continuity pages", () => {
    assert.equal(shouldUseGadgetChrome("/"), true);
    assert.equal(shouldUseGadgetChrome("/home2"), true);
    assert.equal(shouldUseGadgetChrome("/checkout"), false);
    assert.equal(shouldUseGadgetChrome("/checkout", { search: "from=gadget" }), true);
    assert.equal(shouldUseGadgetChrome("/checkout", { sessionActive: true }), true);
    assert.equal(shouldUseGadgetChrome("/cart"), false);
    assert.equal(shouldUseGadgetChrome("/cart", { sessionActive: true }), true);
    assert.equal(shouldUseGadgetChrome("/search", { sessionActive: true }), true);
    assert.equal(shouldUseGadgetChrome("/blog", { sessionActive: true }), true);
    assert.equal(shouldUseGadgetChrome("/products", { sessionActive: true }), false);
    assert.equal(checkoutHref(true), "/checkout?from=gadget");
    assert.equal(checkoutHref(false), "/checkout");
  });
});


describe("videoKind", () => {
  it("classifies Cloudinary/mp4, Instagram, TikTok, and empty", () => {
    assert.equal(videoKind(undefined, "products/clip"), "file");
    assert.equal(videoKind("https://res.cloudinary.com/demo/video/upload/x.mp4"), "file");
    assert.equal(videoKind("https://cdn.example.com/demo.mp4"), "file");
    assert.equal(videoKind("https://www.instagram.com/reel/abc123/"), "instagram");
    assert.equal(videoKind("https://www.tiktok.com/@shop/video/123"), "tiktok");
    assert.equal(videoKind(""), "none");
    assert.equal(videoKind(undefined, undefined), "none");
  });
});

describe("videoEmbedSrc", () => {
  it("builds Instagram and TikTok embed URLs", () => {
    assert.equal(
      videoEmbedSrc("instagram", "https://www.instagram.com/reel/abc123/"),
      "https://www.instagram.com/reel/abc123/embed"
    );
    assert.equal(
      videoEmbedSrc("tiktok", "https://www.tiktok.com/@shop/video/123"),
      "https://www.tiktok.com/embed/@shop/video/123"
    );
    assert.equal(videoEmbedSrc("file", "https://cdn.example.com/x.mp4"), null);
    assert.equal(videoEmbedSrc("none", ""), null);
  });
});

describe("hasShopperProductVideo", () => {
  it("is true when a file, Cloudinary, Instagram, or TikTok link exists", () => {
    assert.equal(hasShopperProductVideo({}), false);
    assert.equal(
      hasShopperProductVideo({ productVideo: { url: "https://cdn.example.com/demo.mp4" } }),
      true
    );
    assert.equal(
      hasShopperProductVideo({ productVideo: { cloudinaryPublicId: "products/clip" } }),
      true
    );
    assert.equal(
      hasShopperProductVideo({ instagramUrl: "https://www.instagram.com/reel/abc123/" }),
      true
    );
    assert.equal(
      hasShopperProductVideo({ tiktokUrl: "https://www.tiktok.com/@shop/video/123" }),
      true
    );
  });
});
