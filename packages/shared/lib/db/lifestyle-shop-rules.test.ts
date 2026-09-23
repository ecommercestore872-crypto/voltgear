import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { enabledHomeSectionIds, normalizeHomeSections } from "./home-section-rules";
import {
  DEFAULT_LIFESTYLE_SHOP,
  homeLayoutIdsForLifestyle,
  lifestyleShopHasContent,
  normalizeLifestyleShop,
  visibleLifestyleTiles,
} from "./lifestyle-shop-rules";

describe("normalizeLifestyleShop", () => {
  it("fills the mosaic when nothing is saved so the homepage can render", () => {
    const shop = normalizeLifestyleShop(null);
    assert.equal(shop.banner.title, "Rethinking everyday tech");
    assert.equal(shop.banner.eyebrow, "Curated for you");
    assert.equal(shop.banner.cta, "Shop now");
    assert.equal(shop.tiles.length, 4);
    assert.deepEqual(
      shop.tiles.map((tile) => tile.title),
      ["For Everyday", "For Adventure", "For Productivity", "For Focus"]
    );
    assert.equal(visibleLifestyleTiles(shop).length, 4);
    assert.equal(lifestyleShopHasContent(shop), true);
    assert.equal(shop.banner.imageUrl, DEFAULT_LIFESTYLE_SHOP.banner.imageUrl);
  });

  it("uses the same mosaic for an empty saved object", () => {
    const shop = normalizeLifestyleShop({ banner: {}, tiles: [] });
    assert.equal(shop.banner.title, DEFAULT_LIFESTYLE_SHOP.banner.title);
    assert.equal(visibleLifestyleTiles(shop).length, 4);
  });

  it("keeps admin banner and tiles without inventing extra cards", () => {
    const shop = normalizeLifestyleShop({
      banner: {
        imageUrl: "https://cdn.example.com/banner.jpg",
        eyebrow: "Owner line",
        title: "Owner heading",
        cta: "See collection",
        href: "/products",
      },
      tiles: [
        { title: "For Everyday", href: "/products/smartwatch", imageUrl: "https://cdn.example.com/a.jpg" },
        { title: "For Adventure", href: "/products/power-bank", imageUrl: "https://cdn.example.com/b.jpg" },
      ],
    });
    assert.equal(shop.banner.title, "Owner heading");
    assert.equal(visibleLifestyleTiles(shop).length, 2);
    assert.equal(shop.tiles[2].title, "");
    assert.equal(lifestyleShopHasContent(shop), true);
  });
});

describe("homeLayoutIdsForLifestyle", () => {
  it("keeps the admin order for categories and lifestyle", () => {
    const sections = normalizeHomeSections([
      { id: "categories", enabled: true },
      { id: "offers", enabled: true },
      { id: "lifestyle", enabled: true },
      { id: "reviews", enabled: true },
    ]);
    const ids = homeLayoutIdsForLifestyle(sections, DEFAULT_LIFESTYLE_SHOP);
    assert.equal(ids.indexOf("categories"), 0);
    assert.ok(ids.indexOf("lifestyle") < ids.indexOf("reviews"));
    assert.ok(ids.indexOf("offers") < ids.indexOf("lifestyle"));
  });

  it("parks lifestyle above reviews when the old layout forced it first", () => {
    const sections = normalizeHomeSections([
      { id: "lifestyle", enabled: true },
      { id: "categories", enabled: true },
      { id: "reviews", enabled: true },
    ]);
    const ids = homeLayoutIdsForLifestyle(sections, DEFAULT_LIFESTYLE_SHOP);
    assert.equal(ids.indexOf("lifestyle"), ids.indexOf("reviews") - 1);
    assert.ok(ids.indexOf("categories") < ids.indexOf("lifestyle"));
  });

  it("hides lifestyle when the owner turned that section off", () => {
    const sections = normalizeHomeSections([
      { id: "categories", enabled: true },
      { id: "lifestyle", enabled: false },
      { id: "reviews", enabled: true },
    ]);
    const ids = homeLayoutIdsForLifestyle(sections, DEFAULT_LIFESTYLE_SHOP);
    assert.ok(!ids.includes("lifestyle"));
    assert.ok(ids.includes("categories"));
    assert.ok(!enabledHomeSectionIds(sections).includes("lifestyle"));
  });
});
