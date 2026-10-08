import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizePublicReview } from "./review-submission-rules";

const valid = {
  slug: "mini-buds",
  rating: 5,
  name: "Ayesha",
  email: "AYESHA@example.com",
  comment: "The product matched the description.",
};

describe("normalizePublicReview", () => {
  it("normalizes a valid review and its approved upload URL", () => {
    const result = normalizePublicReview(
      {
        ...valid,
        image:
          "https://res.cloudinary.com/demo-cloud/image/upload/v1/ecommerce-store/reviews/photo.webp",
      },
      "demo-cloud",
    );

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.email, "ayesha@example.com");
  });

  it("rejects arbitrary external image URLs", () => {
    const result = normalizePublicReview(
      { ...valid, image: "https://tracking.example/pixel.gif" },
      "demo-cloud",
    );
    assert.deepEqual(result, {
      ok: false,
      error: "Review photo must come from the review uploader.",
    });
  });

  it("bounds user supplied fields", () => {
    assert.equal(
      normalizePublicReview({ ...valid, comment: "x".repeat(2_001) }).ok,
      false,
    );
    assert.equal(normalizePublicReview({ ...valid, rating: 4.5 }).ok, false);
  });
});
