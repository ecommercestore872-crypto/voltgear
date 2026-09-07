import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BLOG_AD_MIN_HEIGHT_PX,
  blogInventoryReadyForAds,
  safeBlogHref,
  sanitizeBlogSections,
  stripHtmlNoise,
} from "./blog-safety-rules";
import type { ContentBlock } from "./types";

describe("safeBlogHref", () => {
  it("keeps relative store paths and https shop links", () => {
    assert.equal(safeBlogHref("/products/earbuds"), "/products/earbuds");
    assert.equal(safeBlogHref("https://buyntryy.com/products"), "https://buyntryy.com/products");
  });

  it("blocks script and data URLs that could XSS a CTA", () => {
    assert.equal(safeBlogHref("javascript:alert(1)"), null);
    assert.equal(safeBlogHref("data:text/html,<script>"), null);
    assert.equal(safeBlogHref("//evil.example/phish"), null);
  });
});

describe("sanitizeBlogSections", () => {
  it("drops contact forms and unsafe CTAs from public blog bodies", () => {
    const input: ContentBlock[] = [
      { _type: "paragraph", text: "Hello" },
      { _type: "cta", label: "Hack", href: "javascript:alert(1)" },
      { _type: "cta", label: "Shop", href: "/products" },
      { _type: "contactForm", heading: "Ask us" },
      { _type: "relatedProducts", heading: "Related", products: [] },
    ];
    const out = sanitizeBlogSections(input);
    assert.deepEqual(
      out.map((b) => b._type),
      ["paragraph", "cta"]
    );
    assert.equal(out[1]._type === "cta" ? out[1].href : "", "/products");
  });

  it("strips raw HTML tags from text so guides stay plain content", () => {
    const out = sanitizeBlogSections([
      { _type: "paragraph", text: "Buy <b>earbuds</b> today" },
    ]);
    assert.equal(out[0]._type === "paragraph" ? out[0].text : "", "Buy earbuds today");
  });
});

describe("blogInventoryReadyForAds", () => {
  it("rejects thin posts that would violate valuable-inventory guidance", () => {
    assert.equal(
      blogInventoryReadyForAds({
        title: "Tips",
        excerpt: "Short",
        coverImage: "",
        sections: [{ _type: "paragraph", text: "Hi" }],
      }).ok,
      false
    );
  });

  it("accepts a covered guide with real body sections", () => {
    const ready = blogInventoryReadyForAds({
      title: "Best TWS earbuds in Pakistan 2026",
      excerpt: "How to pick TWS earbuds in Pakistan by price, ENC, and COD without wasting a trip.",
      coverImage: "/blog/cover-tws-earbuds.webp",
      sections: [
        { _type: "heading", level: "h2", text: "One" },
        { _type: "paragraph", text: "Two" },
        { _type: "paragraph", text: "Three" },
        { _type: "list", items: ["Four"] },
      ],
    });
    assert.equal(ready.ok, true);
  });
});

describe("ad layout reserve", () => {
  it("reserves enough height to limit CLS when an ad loads", () => {
    assert.ok(BLOG_AD_MIN_HEIGHT_PX >= 90);
  });
});

describe("stripHtmlNoise", () => {
  it("removes tags but keeps readable words", () => {
    assert.equal(stripHtmlNoise("<b>GaN</b> charger"), "GaN charger");
  });
});
