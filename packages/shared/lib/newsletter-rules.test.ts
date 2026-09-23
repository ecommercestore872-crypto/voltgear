import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { newsletterCsv, normalizeNewsletterEmail } from "./newsletter-rules";

describe("normalizeNewsletterEmail", () => {
  it("rejects empty and malformed addresses", () => {
    assert.equal(normalizeNewsletterEmail("").ok, false);
    assert.equal(normalizeNewsletterEmail("not-an-email").ok, false);
    assert.equal(normalizeNewsletterEmail("a@b").ok, false);
  });

  it("lowercases and trims a valid address", () => {
    const r = normalizeNewsletterEmail("  Ali@Shop.PK  ");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.email, "ali@shop.pk");
  });
});

describe("newsletterCsv", () => {
  it("writes a header and one data row", () => {
    const csv = newsletterCsv([
      { email: "ali@shop.pk", source: "footer", createdAt: "2026-09-05T00:00:00.000Z" },
    ]);
    assert.match(csv, /^email,source,joined\n/);
    assert.match(csv, /ali@shop\.pk,footer,/);
  });
});
