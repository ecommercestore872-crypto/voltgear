import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canDeleteShopType,
  canSaveShopType,
  categoryIsAssignable,
  extraCategoryPathsToRevalidate,
  shopTypeSlugTaken,
} from "./category-rules";
import {
  mergeProductForm,
  slugify,
  type ProductDocument,
} from "./publish";

const existing: ProductDocument = {
  name: "VoltGear Pro",
  slug: "voltgear-pro",
  category: "smartwatch",
  price: 14999,
  stockStatus: "in-stock",
  images: ["https://example.com/a.jpg"],
  brand: "VoltGear",
  sku: "VG-1",
  badge: "New",
  features: ["USB-C"],
  specifications: [{ label: "Weight", value: "50g" }],
  compatibility: ["iPhone"],
  inTheBox: ["Watch", "Cable"],
  productFaq: [{ question: "Waterproof?", answer: "Yes" }],
  variants: [{ name: "Black", stockStatus: "in-stock" }],
  reviews: [{ name: "Ali", rating: 5, comment: "Great" }],
  productVideo: {
    url: "https://old.example/clip.mp4",
    cloudinaryPublicId: "products/old-clip",
    poster: "https://example.com/old-poster.jpg",
  },
};

describe("canDeleteShopType", () => {
  it("blocks delete while products still use the type", () => {
    const result = canDeleteShopType(6);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /6 products/i);
    }
  });

  it("allows delete when no products use it", () => {
    assert.equal(canDeleteShopType(0).ok, true);
  });
});

describe("canSaveShopType", () => {
  it("requires a name", () => {
    assert.equal(canSaveShopType({ name: "  ", slug: "cables" }).ok, false);
    assert.equal(canSaveShopType({ name: "Cables", slug: "cables" }).ok, true);
  });
});

const liveTypes = [{ slug: "smartwatch" }, { slug: "power-bank" }];

describe("categoryIsAssignable", () => {
  it("allows a slug that exists in Shop types", () => {
    assert.equal(categoryIsAssignable("smartwatch", liveTypes).ok, true);
  });

  it("rejects empty or unknown slugs", () => {
    assert.equal(categoryIsAssignable("", liveTypes).ok, false);
    assert.equal(categoryIsAssignable("  ", liveTypes).ok, false);
    assert.equal(categoryIsAssignable("charger", liveTypes).ok, false);
    const missing = categoryIsAssignable(undefined, liveTypes);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.match(missing.error, /pick a category/i);
  });
});

describe("extraCategoryPathsToRevalidate", () => {
  it("refreshes the new page and the old page when the assignment changes", () => {
    assert.deepEqual(extraCategoryPathsToRevalidate("smartwatch", "power-bank"), [
      "/products/power-bank",
      "/products/smartwatch",
    ]);
  });

  it("does not repeat the path when the category stays the same", () => {
    assert.deepEqual(extraCategoryPathsToRevalidate("smartwatch", "smartwatch"), [
      "/products/smartwatch",
    ]);
  });
});

describe("shopTypeSlugTaken", () => {
  it("rejects a slug used by another type", () => {
    assert.equal(
      shopTypeSlugTaken("cables", [{ id: "1", slug: "cables" }], "2"),
      true
    );
    assert.equal(
      shopTypeSlugTaken("cables", [{ id: "1", slug: "cables" }], "1"),
      false
    );
  });
});

describe("mergeProductForm", () => {
  it("keeps FAQ, variants, and specs when the short form omits them", () => {
    const merged = mergeProductForm(existing, {
      name: "VoltGear Pro",
      slug: "voltgear-pro",
      category: "smartwatch",
      price: 14999,
      stockStatus: "in-stock",
      images: ["https://example.com/a.jpg"],
      shortDescription: "Updated",
      productFaq: [],
      variants: [],
      features: [],
    });
    assert.deepEqual(merged.productFaq, existing.productFaq);
    assert.deepEqual(merged.variants, existing.variants);
    assert.deepEqual(merged.specifications, existing.specifications);
    assert.equal(merged.brand, "VoltGear");
    assert.equal(merged.shortDescription, "Updated");
  });

  it("uses a pasted TikTok link and drops the old Cloudinary id", () => {
    const merged = mergeProductForm(existing, {
      name: existing.name,
      slug: existing.slug,
      category: existing.category,
      price: existing.price,
      stockStatus: existing.stockStatus,
      images: existing.images,
      productVideo: { url: "https://www.tiktok.com/@shop/video/123" },
    });
    assert.equal(merged.productVideo?.url, "https://www.tiktok.com/@shop/video/123");
    assert.equal(merged.productVideo?.cloudinaryPublicId, undefined);
  });

  it("clears video when the link is empty", () => {
    const merged = mergeProductForm(existing, {
      name: existing.name,
      slug: existing.slug,
      category: existing.category,
      price: existing.price,
      stockStatus: existing.stockStatus,
      images: existing.images,
      productVideo: { url: "" },
    });
    assert.equal(merged.productVideo, undefined);
  });

  it("fills the web address from the product name", () => {
    const merged = mergeProductForm(undefined, {
      name: "GaN 65W Charger",
      slug: "",
      category: "charger",
      price: 5499,
      stockStatus: "in-stock",
      images: [],
    });
    assert.equal(merged.slug, slugify("GaN 65W Charger"));
  });
});
