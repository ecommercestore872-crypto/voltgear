import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FALLBACK_BLOG_POSTS } from "./blog-data";
import {
  blogSeoDefaults,
  normalizePageSeo,
  sortBlogPostsForHome,
  validateBlogDoc,
} from "./blog-desk-rules";
import type { Page } from "./types";

const body = [
  { _type: "heading" as const, level: "h2" as const, text: "One" },
  { _type: "paragraph" as const, text: "Two" },
  { _type: "paragraph" as const, text: "Three" },
  { _type: "list" as const, items: ["Four"] },
];

describe("normalizePageSeo", () => {
  it("keeps featured and home order from saved seo json", () => {
    const seo = normalizePageSeo({
      title: " Best TWS earbuds ",
      featured: true,
      homeOrder: "2",
    });
    assert.equal(seo.title, "Best TWS earbuds");
    assert.equal(seo.featured, true);
    assert.equal(seo.homeOrder, 2);
  });
});

describe("blogSeoDefaults", () => {
  it("clips title and excerpt to snippet limits", () => {
    const seo = blogSeoDefaults({
      title: "A".repeat(80),
      excerpt: "B".repeat(200),
    });
    assert.equal(seo.title?.length, 60);
    assert.equal(seo.description?.length, 160);
  });
});

describe("validateBlogDoc", () => {
  it("rejects a thin post without a real excerpt or body", () => {
    const bad = validateBlogDoc({
      title: "Tips",
      slug: "tips",
      excerpt: "Short",
      sections: [{ _type: "paragraph", text: "Hi" }],
    });
    assert.equal(bad.ok, false);
  });

  it("accepts a complete buying guide", () => {
    const ok = validateBlogDoc({
      title: "Best TWS earbuds in Pakistan 2026",
      slug: "best-tws-earbuds-pakistan-2026",
      excerpt: "How to pick TWS earbuds in Pakistan by price, ENC, and COD without wasting a trip.",
      coverImage: "/blog/cover-tws-earbuds.webp",
      seo: blogSeoDefaults({
        title: "Best TWS earbuds in Pakistan 2026",
        excerpt: "How to pick TWS earbuds in Pakistan by price, ENC, and COD without wasting a trip.",
      }),
      sections: body,
    });
    assert.equal(ok.ok, true);
  });

  it("accepts every seeded Pakistan guide", () => {
    for (const post of FALLBACK_BLOG_POSTS) {
      const check = validateBlogDoc(post);
      assert.equal(check.ok, true, `${post.slug}: ${check.ok ? "" : check.error}`);
      assert.ok(post.coverImage, `${post.slug} needs a cover`);
    }
    assert.equal(FALLBACK_BLOG_POSTS.length, 6);
  });
});

describe("sortBlogPostsForHome", () => {
  const posts: Page[] = [
    {
      title: "Old cover",
      slug: "old",
      coverImage: "/a.jpg",
      publishedAt: "2026-01-01T00:00:00Z",
      seo: { featured: false, homeOrder: 3 },
    },
    {
      title: "Pinned",
      slug: "pin",
      publishedAt: "2026-02-01T00:00:00Z",
      seo: { featured: true, homeOrder: 2 },
    },
    {
      title: "First pin",
      slug: "first",
      publishedAt: "2026-03-01T00:00:00Z",
      seo: { featured: true, homeOrder: 1 },
    },
  ];

  it("puts featured posts first, then home order", () => {
    const popular = sortBlogPostsForHome(posts, "popular").map((p) => p.slug);
    assert.deepEqual(popular, ["first", "pin", "old"]);
  });

  it("sorts latest by published date", () => {
    const latest = sortBlogPostsForHome(posts, "latest").map((p) => p.slug);
    assert.deepEqual(latest, ["first", "pin", "old"]);
  });
});
