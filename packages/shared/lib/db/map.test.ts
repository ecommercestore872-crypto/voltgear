import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapProduct } from "./map";

describe("mapProduct", () => {
  it("does not expose cost_price on the public product", () => {
    const product = mapProduct({
      id: "1",
      name: "Watch",
      slug: "watch",
      category: "smartwatch",
      price: 5000,
      cost_price: 1200,
      stock_status: "in-stock",
      product_images: [],
      product_variants: [],
      product_reviews: [],
    });
    assert.equal(product?.price, 5000);
    assert.equal("costPrice" in (product ?? {}), false);
    assert.equal(JSON.stringify(product).includes("1200"), false);
    assert.equal(JSON.stringify(product).includes("cost_price"), false);
  });

  it("maps color and size option columns", () => {
    const product = mapProduct({
      id: "1",
      name: "Hoodie",
      slug: "hoodie",
      category: "apparel",
      price: 2000,
      stock_status: "in-stock",
      color_enabled: true,
      size_enabled: true,
      color_options: [{ key: "black", name: "Black", enabled: true, image: "https://img/b.jpg" }],
      size_options: [{ key: "m", name: "M", enabled: true }],
      product_images: [],
      product_variants: [],
      product_reviews: [],
    });
    assert.equal(product?.colorEnabled, true);
    assert.equal(product?.sizeEnabled, true);
    assert.equal(product?.colorOptions?.[0].image, "https://img/b.jpg");
    assert.equal(product?.sizeOptions?.[0].name, "M");
  });
});
