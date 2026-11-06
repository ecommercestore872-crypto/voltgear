import assert from "node:assert/strict";
import { test } from "node:test";

import { heroSlidesToBanners } from "./gadget-hero-banners";
import type { HeroSlide } from "./types";

const slide = {
  id: "legacy-banner",
  title: "More Than Gadgets",
  subtitle: JSON.stringify({ text: "A Smarter Everyday", artworkText: true, cta: "Shop now" }),
  imageUrl: "https://res.cloudinary.com/demo/image/upload/legacy.jpg",
  product: { slug: "watch", stockStatus: "in-stock" },
  sortOrder: 0,
} as HeroSlide;

test("admin artwork-text mode preserves accessible copy and a separate CTA", () => {
  const [banner] = heroSlidesToBanners([slide]);
  assert.equal(banner.artworkText, true);
  assert.equal(banner.title, slide.title);
  assert.equal(banner.subtitle, "A Smarter Everyday");
  assert.equal(banner.ctaLabel, "Shop now");
});

test("ordinary admin slides keep the HTML copy overlay", () => {
  const [banner] = heroSlidesToBanners([{ ...slide, subtitle: "A Smarter Everyday" }]);
  assert.equal(banner.artworkText, false);
});
