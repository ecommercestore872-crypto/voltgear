import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applySaveDraft,
  canPublish,
  canSaveDraft,
  mergeApprovedReview,
  shopVisible,
  slugify,
  slugTaken,
  toImageRows,
  toLiveProductRow,
  toReviewRows,
  toVariantRows,
  withGeneratedVariants,
  type ProductDocument,
} from "./publish";

const sample: ProductDocument = {
  name: "VoltGear Pro",
  slug: "voltgear-pro",
  category: "smartwatch",
  price: 12900,
  stockStatus: "in-stock",
  images: ["https://res.cloudinary.com/demo/image/upload/watch.jpg"],
  productVideo: {
    url: "https://www.instagram.com/reel/abc/",
    cloudinaryPublicId: "products/demo",
    poster: "https://res.cloudinary.com/demo/image/upload/poster.jpg",
  },
  variants: [
    {
      _key: "black",
      name: "Black",
      stockStatus: "in-stock",
      isDefault: true,
    },
  ],
  features: ["USB-C"],
  reviews: [{ name: "Ali", rating: 5, comment: "Great", verified: true }],
};

describe("shopVisible", () => {
  it("shows only published records on the shop", () => {
    assert.equal(shopVisible("published"), true);
    assert.equal(shopVisible("draft"), false);
    assert.equal(shopVisible("unpublished"), false);
    assert.equal(shopVisible(null), false);
  });
});

const shopTypes = [{ slug: "smartwatch" }, { slug: "power-bank" }];

describe("canSaveDraft", () => {
  it("requires name, slug, and a real category", () => {
    assert.equal(canSaveDraft({ name: "", slug: "x", category: "smartwatch" }, shopTypes).ok, false);
    assert.equal(canSaveDraft({ name: "Watch", slug: "", category: "smartwatch" }, shopTypes).ok, false);
    assert.equal(canSaveDraft({ name: "Watch", slug: "watch", category: "" }, shopTypes).ok, false);
    assert.equal(canSaveDraft({ name: "Watch", slug: "watch", category: "charger" }, shopTypes).ok, false);
    assert.equal(canSaveDraft({ name: "Watch", slug: "watch", category: "smartwatch" }, shopTypes).ok, true);
  });
});

describe("canPublish", () => {
  it("requires name, slug, a real category, and a non-negative price", () => {
    assert.equal(canPublish({ ...sample, name: "" }, shopTypes).ok, false);
    assert.equal(canPublish({ ...sample, category: "" }, shopTypes).ok, false);
    assert.equal(canPublish({ ...sample, category: "charger" }, shopTypes).ok, false);
    assert.equal(canPublish({ ...sample, price: -1 }, shopTypes).ok, false);
    assert.equal(canPublish(sample, shopTypes).ok, true);
  });

  it("rejects Color on with no enabled colors", () => {
    const r = canPublish(
      {
        ...sample,
        colorEnabled: true,
        colorOptions: [{ key: "red", name: "Red", enabled: false }],
      },
      shopTypes
    );
    assert.equal(r.ok, false);
  });
});

describe("withGeneratedVariants", () => {
  it("replaces flat variants with enabled color × size rows", () => {
    const doc = withGeneratedVariants({
      ...sample,
      colorEnabled: true,
      sizeEnabled: true,
      colorOptions: [
        { key: "black", name: "Black", enabled: true },
        { key: "navy", name: "Navy", enabled: false },
      ],
      sizeOptions: [
        { key: "m", name: "M", enabled: true },
        { key: "l", name: "L", enabled: true },
      ],
    });
    assert.deepEqual(
      (doc.variants ?? []).map((v) => v._key),
      ["black__m", "black__l"]
    );
  });
});

describe("slugTaken", () => {
  it("rejects a slug used by another product", () => {
    assert.equal(
      slugTaken("voltgear-pro", [{ id: "1", slug: "voltgear-pro" }], "2"),
      true
    );
    assert.equal(
      slugTaken("voltgear-pro", [{ id: "1", slug: "voltgear-pro" }], "1"),
      false
    );
  });
});

describe("applySaveDraft", () => {
  it("does not change live columns", () => {
    const live = { name: "Old", price: 10, slug: "old" };
    const saved = applySaveDraft(live, sample);
    assert.equal(saved.name, "Old");
    assert.equal(saved.price, 10);
    assert.equal(saved.draft.slug, "voltgear-pro");
  });
});

describe("toLiveProductRow", () => {
  it("copies every product field including video", () => {
    const row = toLiveProductRow(sample);
    assert.equal(row.name, "VoltGear Pro");
    assert.equal(row.slug, "voltgear-pro");
    assert.equal(row.price, 12900);
    assert.equal(row.status, "published");
    assert.equal(row.draft, null);
    assert.equal(row.product_video?.url, "https://www.instagram.com/reel/abc/");
    assert.equal(row.product_video?.cloudinaryPublicId, "products/demo");
    assert.deepEqual(row.features, ["USB-C"]);
    assert.equal(row.is_demo, false);
    assert.equal(row.cost_price, null);
  });

  it("writes internal cost_price from the document", () => {
    const row = toLiveProductRow({ ...sample, costPrice: 4100 });
    assert.equal(row.cost_price, 4100);
  });

  it("writes is_demo when the document is tagged demo", () => {
    const row = toLiveProductRow({ ...sample, isDemo: true });
    assert.equal(row.is_demo, true);
  });

  it("writes units on hand and leaves empty as unlimited", () => {
    assert.equal(toLiveProductRow(sample).quantity, null);
    assert.equal(toLiveProductRow({ ...sample, quantity: 8 }).quantity, 8);
  });
});

describe("child rows", () => {
  it("maps images, variants, and reviews from the draft document", () => {
    assert.equal(toImageRows("p1", sample.images).length, 1);
    assert.equal(toImageRows("p1", sample.images)[0].url, sample.images[0]);
    assert.equal(toVariantRows("p1", sample.variants)[0].name, "Black");
    assert.equal(toReviewRows("p1", sample.reviews)[0].name, "Ali");
  });
});

describe("mergeApprovedReview", () => {
  it("appends to live reviews and to an existing draft so publish cannot drop it", () => {
    const approved = { name: "Sara", rating: 4, comment: "Nice", verified: true };
    const result = mergeApprovedReview(sample, sample.reviews ?? [], approved);
    assert.equal(result.liveReviews.length, 2);
    assert.equal(result.draft?.reviews?.length, 2);
    assert.equal(result.draft?.reviews?.at(-1)?.name, "Sara");
  });

  it("still updates live reviews when there is no draft", () => {
    const approved = { name: "Sara", rating: 4, comment: "Nice" };
    const result = mergeApprovedReview(null, [], approved);
    assert.equal(result.draft, null);
    assert.equal(result.liveReviews.length, 1);
  });
});

describe("slugify", () => {
  it("turns a product name into a url slug", () => {
    assert.equal(slugify("VoltGear Pro S2"), "voltgear-pro-s2");
  });
});
