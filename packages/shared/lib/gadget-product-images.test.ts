import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyGadgetStudioImages,
  gadgetStudioImagesFor,
} from "./gadget-product-images";
import type { Product } from "./types";

function stub(partial: Partial<Product> & Pick<Product, "slug" | "category">): Product {
  return {
    _id: "1",
    name: "Test",
    price: 1000,
    images: ["https://res.cloudinary.com/demo/image/upload/old.jpg"],
    cloudinaryImages: ["folder/old"],
    stockStatus: "in-stock",
    ...partial,
  };
}

describe("gadget-product-images", () => {
  it("maps each published slug to local studio webps", () => {
    const studio = gadgetStudioImagesFor("mini-buds", "earbuds");
    assert.ok(studio);
    assert.equal(studio!.length, 2);
    assert.match(studio![0], /\/gadget\/products\/prod-mini-buds\.webp$/);
    assert.match(studio![1], /prod-angle-earbuds\.webp$/);
  });

  it("replaces catalog images for preview without mutating original refs wrongly", () => {
    const original = stub({ slug: "slim-10k", category: "power-bank" });
    const next = applyGadgetStudioImages(original);
    assert.notEqual(next.images[0], original.images[0]);
    assert.equal(next.cloudinaryImages?.length, 0);
    assert.match(next.images[0], /prod-slim-10k\.webp$/);
  });

  it("leaves unknown slugs unchanged", () => {
    const original = stub({ slug: "unknown-sku", category: "charger" });
    assert.equal(applyGadgetStudioImages(original), original);
  });
});
