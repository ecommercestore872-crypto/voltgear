import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPublishSlide,
  canPublishHome,
  resolveSlideCta,
  MAX_HERO_SLIDES,
} from "./hero-slide-rules";

describe("hero-slide-rules", () => {
  it("requires image and product to publish a slide", () => {
    assert.equal(canPublishSlide({ imageUrl: "", productId: "p1" }).ok, false);
    assert.equal(canPublishSlide({ imageUrl: "https://x", productId: "" }).ok, false);
    assert.equal(canPublishSlide({ imageUrl: "https://x", productId: "p1" }).ok, true);
  });

  it("blocks home publish without slides or testimonials", () => {
    const r = canPublishHome({ publishedSlideCount: 0, publishedTestimonialCount: 1 });
    assert.equal(r.ok, false);
    assert.match(r.blockers.join(" "), /slide/i);
  });

  it("disables CTA when out of stock", () => {
    assert.deepEqual(resolveSlideCta("out-of-stock"), {
      label: "Out of stock",
      disabled: true,
    });
    assert.deepEqual(resolveSlideCta("in-stock"), {
      label: "Shop now",
      disabled: false,
    });
  });

  it("caps at 8", () => {
    assert.equal(MAX_HERO_SLIDES, 8);
  });
});
