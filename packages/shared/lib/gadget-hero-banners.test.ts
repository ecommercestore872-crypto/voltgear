import assert from "node:assert/strict";
import { test } from "node:test";

import { hasClaimedHeroArtwork, heroSlidesToBanners } from "./gadget-hero-banners";
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

test("published artwork with the unsupported count becomes a text-only hero", () => {
  const claimed = {
    ...slide,
    imageUrl: "https://res.cloudinary.com/t5evppnl/image/upload/v1/admin/stm72jeeup4qg0rcwrh9.png",
    subtitle: JSON.stringify({ text: "A Smarter Everyday", mobile: "https://res.cloudinary.com/t5evppnl/image/upload/v1/admin/z0kxjmp7dmyfv9lfaytc.png", linkType: "all" }),
  };
  assert.equal(hasClaimedHeroArtwork(claimed), true);
  const [banner] = heroSlidesToBanners([claimed]);
  assert.equal(banner.textOnly, true);
  assert.equal(banner.imageUrl, "");
  assert.equal(banner.mobileImageUrl, "");
  assert.equal(banner.title, "More Than Gadgets");
  assert.equal(banner.subtitle, "A Smarter Everyday");
  assert.equal(banner.ctaLabel, "Shop products");
  assert.equal(banner.href, "/products");
});

test("replaced artwork is displayed normally", () => {
  const replacement = { ...slide, imageUrl: "/gadget/new-hero.webp", subtitle: "A Smarter Everyday" };
  assert.equal(hasClaimedHeroArtwork(replacement), false);
  const [banner] = heroSlidesToBanners([replacement]);
  assert.equal(banner.textOnly, false);
  assert.equal(banner.imageUrl, replacement.imageUrl);
});
