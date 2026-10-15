import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { validateAbandonedCart } from "./abandoned-cart-rules";
import {
  newsletterCsv,
  normalizeNewsletterEmail,
  normalizeNewsletterSource,
  safeWebhookText,
} from "./newsletter-rules";
import {
  normalizeReviewImageUrl,
  validateReviewSubmission,
} from "./review-submission-rules";
import { hasExpectedImageSignature } from "./upload-rules";
import { parseReviewModerationInput } from "./review-moderation-rules";

describe("public input integrity", () => {
  it("normalizes real email and rejects header-like or malformed values", () => {
    assert.deepEqual(normalizeNewsletterEmail(" Ali@Example.COM "), {
      ok: true,
      email: "ali@example.com",
    });
    assert.equal(normalizeNewsletterEmail("a@b.com\nBcc:x@y.com").ok, false);
    assert.equal(normalizeNewsletterEmail("a@@example.com").ok, false);
  });

  it("bounds source values and protects CSV exports from formulas", () => {
    assert.equal(normalizeNewsletterSource("Back_In-Stock"), "back_in-stock");
    assert.equal(normalizeNewsletterSource("../../bad"), "other");
    const csv = newsletterCsv([
      { email: "=cmd@example.com", source: "+formula", createdAt: "now" },
    ]);
    assert.match(csv, /'=cmd@example\.com,'\+formula,now/);
  });

  it("neutralizes webhook markup and control characters", () => {
    assert.equal(safeWebhookText("<!channel>\u0000", 100), "&lt;!channel&gt;");
  });

  it("validates reviews and accepts only this Cloudinary account", () => {
    const url = "https://res.cloudinary.com/shop/image/upload/v1/reviews/a.webp";
    assert.equal(normalizeReviewImageUrl(url, "shop"), url);
    assert.equal(normalizeReviewImageUrl("https://evil.test/a.webp", "shop"), undefined);
    assert.equal(
      validateReviewSubmission(
        {
          slug: "charger",
          rating: 5,
          name: "Ali",
          email: "ali@example.com",
          comment: "Works well",
          image: url,
        },
        "shop",
      ).ok,
      true,
    );
  });

  it("derives a bounded abandoned-cart subtotal instead of trusting the client", () => {
    const result = validateAbandonedCart({
      email: "a@example.com",
      subtotal: 1,
      items: [{ name: "Charger", price: 500, quantity: 2 }],
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.subtotal, 1000);
  });

  it("checks image signatures rather than trusting MIME labels", () => {
    assert.equal(
      hasExpectedImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg"),
      true,
    );
    assert.equal(
      hasExpectedImageSignature(Uint8Array.from([0x47, 0x49, 0x46]), "image/jpeg"),
      false,
    );
  });

  it("requires an explicit moderation action and a UUID", () => {
    assert.equal(parseReviewModerationInput({ id: "x", action: "approve" }).ok, false);
    assert.equal(
      parseReviewModerationInput({
        id: "123e4567-e89b-42d3-a456-426614174000",
        action: "approve",
      }).ok,
      true,
    );
    assert.equal(
      parseReviewModerationInput({
        id: "123e4567-e89b-42d3-a456-426614174000",
        action: "unexpected",
      }).ok,
      false,
    );
  });
});

describe("atomic review moderation", () => {
  const root = path.resolve(__dirname, "../../..");
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/20261023000000_atomic_review_moderation.sql"),
    "utf8",
  );
  const adapter = fs.readFileSync(
    path.join(root, "packages/shared/lib/db/admin-review-store.ts"),
    "utf8",
  );

  it("links a submission to one published review and updates projections atomically", () => {
    assert.match(migration, /submission_id uuid[\s\S]*ON DELETE CASCADE/iu);
    assert.match(migration, /CREATE UNIQUE INDEX[\s\S]*product_reviews_submission_uidx/iu);
    assert.match(
      migration,
      /WHERE s\.status = 'approved'[\s\S]*NOT EXISTS[\s\S]*linked\.submission_id = s\.id/iu,
    );
    assert.match(
      migration,
      /r\.name IS NOT DISTINCT FROM s\.name[\s\S]*r\.comment IS NOT DISTINCT FROM s\.comment[\s\S]*r\.rating IS NOT DISTINCT FROM s\.rating/iu,
    );
    assert.match(migration, /FUNCTION public\.admin_moderate_review/iu);
    assert.match(migration, /sync_product_review_projection/iu);
    assert.match(adapter, /\.rpc\("admin_moderate_review"/);
  });

  it("excludes practice reviews from live rating and restricts commands", () => {
    assert.match(
      migration,
      /count\(\*\) FILTER \(WHERE COALESCE\(pr\.is_demo, false\) = false\)/iu,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.admin_moderate_review[\s\S]*authenticated/iu,
    );
    assert.match(migration, /GRANT EXECUTE[\s\S]*TO service_role/iu);
  });

  it("deletes through the linked cascade and refreshes product projection", () => {
    assert.match(migration, /FUNCTION public\.admin_delete_review/iu);
    assert.match(migration, /DELETE FROM public\.review_submissions[\s\S]*sync_product_review_projection/iu);
    assert.match(adapter, /\.rpc\("admin_delete_review"/);
  });
});
