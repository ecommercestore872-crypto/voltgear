import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cartHasSlug,
  mergeCartHydration,
  parseCartStorage,
} from "./cart-hydration-rules";

describe("cart-hydration-rules", () => {
  const stylus = {
    slug: "universal-active-stylus-pen",
    name: "Stylus",
    price: 1999,
    quantity: 1,
  };

  it("parseCartStorage treats empty and [] as empty arrays", () => {
    assert.deepEqual(parseCartStorage(null), []);
    assert.deepEqual(parseCartStorage(""), []);
    assert.deepEqual(parseCartStorage("[]"), []);
  });

  it("mergeCartHydration keeps in-memory add when storage is empty []", () => {
    const merged = mergeCartHydration([stylus], []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.slug, stylus.slug);
  });

  it("mergeCartHydration restores storage when memory is empty", () => {
    const merged = mergeCartHydration([], [stylus]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.slug, stylus.slug);
  });

  it("mergeCartHydration does not let empty storage wipe a prior add (race)", () => {
    // Simulates: addItem landed, then hydrate reads localStorage "[]"
    const afterRace = mergeCartHydration([stylus], parseCartStorage("[]"));
    assert.equal(afterRace.length, 1);
    assert.ok(cartHasSlug(afterRace, stylus.slug));
  });

  it("cartHasSlug requires positive qty and price", () => {
    assert.equal(cartHasSlug([stylus], stylus.slug), true);
    assert.equal(
      cartHasSlug([{ ...stylus, quantity: 0 }], stylus.slug),
      false,
    );
    assert.equal(cartHasSlug([{ ...stylus, price: 0 }], stylus.slug), false);
  });
});
