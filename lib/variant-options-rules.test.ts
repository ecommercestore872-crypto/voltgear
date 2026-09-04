import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getVariantStockState } from "./stock";
import type { Product } from "./types";
import {
  canSubmitVariantSelection,
  colorImageForKey,
  comboVariantKey,
  generateSellableVariants,
  initialAxisSelection,
  optionKey,
  parseVariantOptions,
  validateVariantAxes,
} from "./variant-options-rules";

const hoodie = {
  colorEnabled: true,
  sizeEnabled: true,
  colorOptions: [
    { key: "black", name: "Black", enabled: true, image: "https://img/black.jpg" },
    { key: "navy", name: "Navy", enabled: false },
  ],
  sizeOptions: [
    { key: "m", name: "M", enabled: true },
    { key: "xl", name: "XL", enabled: false },
    { key: "l", name: "L", enabled: true },
  ],
};

describe("optionKey", () => {
  it("slugifies a color name", () => {
    assert.equal(optionKey("  Navy Blue  "), "navy-blue");
  });
});

describe("validateVariantAxes", () => {
  it("rejects Color on with no enabled colors", () => {
    const r = validateVariantAxes({
      colorEnabled: true,
      colorOptions: [{ key: "red", name: "Red", enabled: false }],
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /at least one color/i);
  });

  it("rejects duplicate size names", () => {
    const r = validateVariantAxes({
      sizeEnabled: true,
      sizeOptions: [
        { key: "m", name: "M", enabled: true },
        { key: "m2", name: "m", enabled: true },
      ],
    });
    assert.equal(r.ok, false);
  });

  it("accepts both axes with live values", () => {
    assert.equal(validateVariantAxes(hoodie).ok, true);
  });
});

describe("generateSellableVariants", () => {
  it("builds only enabled color × size combos", () => {
    const rows = generateSellableVariants(hoodie);
    assert.deepEqual(
      rows.map((r) => r._key),
      ["black__m", "black__l"]
    );
    assert.equal(rows[0].name, "Black / M");
    assert.equal(rows[0].image, "https://img/black.jpg");
    assert.equal(rows.some((r) => r._key.includes("navy") || r._key.includes("xl")), false);
  });

  it("returns no rows when both axes are off", () => {
    assert.deepEqual(generateSellableVariants({ colorEnabled: false, sizeEnabled: false }), []);
  });

  it("marks the only row as default", () => {
    const rows = generateSellableVariants({
      colorEnabled: true,
      colorOptions: [{ key: "black", name: "Black", enabled: true }],
    });
    assert.equal(rows[0].isDefault, true);
  });
});

describe("selection", () => {
  it("requires both picks when both axes are on", () => {
    assert.equal(canSubmitVariantSelection(hoodie, "black", null), false);
    assert.equal(canSubmitVariantSelection(hoodie, "black", "m"), true);
    assert.equal(canSubmitVariantSelection(hoodie, "navy", "m"), false);
  });

  it("pre-selects only when one value is enabled", () => {
    assert.equal(initialAxisSelection(hoodie.colorOptions), "black");
    assert.equal(initialAxisSelection(hoodie.sizeOptions), null);
  });

  it("builds combo keys and finds the color photo", () => {
    assert.equal(comboVariantKey("black", "m"), "black__m");
    assert.equal(colorImageForKey(hoodie.colorOptions, "black"), "https://img/black.jpg");
    assert.equal(colorImageForKey(hoodie.colorOptions, "navy"), undefined);
  });
});

describe("getVariantStockState with axes", () => {
  it("uses product stock when Color or Size is on, even if a variant is out of stock", () => {
    const product = {
      colorEnabled: true,
      stockStatus: "in-stock",
    } as Product;
    const sold = getVariantStockState(product, {
      name: "Black",
      stockStatus: "out-of-stock",
    });
    assert.equal(sold.soldOut, false);
    assert.equal(
      getVariantStockState({ ...product, stockStatus: "out-of-stock" }, null).soldOut,
      true
    );
  });
});

describe("parseVariantOptions", () => {
  it("drops empty names and treats missing enabled as on", () => {
    const parsed = parseVariantOptions([
      { name: " Red ", image: "https://img/red.jpg" },
      { name: "  " },
    ]);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].key, "red");
    assert.equal(parsed[0].enabled, true);
  });
});
