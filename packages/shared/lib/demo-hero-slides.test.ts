import test from "node:test";
import assert from "node:assert";

import { getHeroSlides } from "./demo-hero-slides";
import type { HeroSection } from "./types";

test("getHeroSlides: Multi-image admin hero slides logic", async (t) => {
  await t.test("maps legacy single background image to 1 slide", () => {
    const hero: HeroSection = {
      headline: "Legacy Hero",
      backgroundImage: "/img1.jpg",
    };
    const slides = getHeroSlides(hero);
    assert.strictEqual(slides.length, 1);
    assert.strictEqual(slides[0].image, "/img1.jpg");
    assert.strictEqual(slides[0].headline, "Legacy Hero");
  });

  await t.test("maps 1 backgroundImages entry to 1 slide", () => {
    const hero: HeroSection = {
      headline: "Single Slide Hero",
      backgroundImages: ["/img1.jpg"],
    };
    const slides = getHeroSlides(hero);
    assert.strictEqual(slides.length, 1);
    assert.strictEqual(slides[0].image, "/img1.jpg");
  });

  await t.test("maps 2 backgroundImages entries to 2 slides", () => {
    const hero: HeroSection = {
      headline: "Dual Slide Hero",
      backgroundImages: ["/img1.jpg", "/img2.jpg"],
    };
    const slides = getHeroSlides(hero);
    assert.strictEqual(slides.length, 2);
    assert.strictEqual(slides[0].image, "/img1.jpg");
    assert.strictEqual(slides[1].image, "/img2.jpg");
  });

  await t.test("maps 4 backgroundImages entries to 4 slides in exact admin order", () => {
    const hero: HeroSection = {
      headline: "Quad Slide Hero",
      backgroundImages: ["/img1.jpg", "/img2.jpg", "/img3.jpg", "/img4.jpg"],
    };
    const slides = getHeroSlides(hero);
    assert.strictEqual(slides.length, 4);
    assert.strictEqual(slides[0].image, "/img1.jpg");
    assert.strictEqual(slides[1].image, "/img2.jpg");
    assert.strictEqual(slides[2].image, "/img3.jpg");
    assert.strictEqual(slides[3].image, "/img4.jpg");
  });

  await t.test("reflects image removal and reordering", () => {
    const heroInitial: HeroSection = {
      headline: "Hero",
      backgroundImages: ["/a.jpg", "/b.jpg", "/c.jpg"],
    };
    assert.strictEqual(getHeroSlides(heroInitial).length, 3);

    // After removing b.jpg and swapping c and a
    const heroUpdated: HeroSection = {
      headline: "Hero",
      backgroundImages: ["/c.jpg", "/a.jpg"],
    };
    const updatedSlides = getHeroSlides(heroUpdated);
    assert.strictEqual(updatedSlides.length, 2);
    assert.strictEqual(updatedSlides[0].image, "/c.jpg");
    assert.strictEqual(updatedSlides[1].image, "/a.jpg");
  });

  await t.test("handles empty hero section safely without crashing", () => {
    const slides = getHeroSlides(null);
    assert.ok(slides.length >= 1);
    assert.ok(slides[0].headline);
  });

  await t.test("never uses demo slides when admin configured images exist", () => {
    const hero: HeroSection = {
      headline: "Configured Hero",
      backgroundImages: ["/custom1.jpg"],
    };
    const slides = getHeroSlides(hero, [
      { _id: "1", name: "P1", slug: "p1", category: "c", price: 10, stockStatus: "in-stock", images: ["/p1.jpg"] }
    ]);
    assert.strictEqual(slides.length, 1);
    assert.strictEqual(slides[0].image, "/custom1.jpg");
  });
});
