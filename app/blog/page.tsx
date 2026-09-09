import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, User } from "lucide-react";

import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { fetchBlogPosts } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { imageUrl } from "@/lib/sanity/image";
import type { Page } from "@/lib/types";

import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";
import { publicSiteUrl } from "@/lib/deploy-rules";
import { sortBlogPostsForHome } from "@/lib/blog-desk-rules";
import { storeAlternatesLanguages } from "@/lib/seo-rules";

export const metadata: Metadata = {
  title: "Buying guides: earbuds, GaN chargers, power banks",
  description:
    "Pakistan-first guides to TWS earbuds, 65W GaN chargers, 20,000mAh power banks, AMOLED watches, and cash on delivery. Written for how people here actually shop.",
  keywords: [
    "best earbuds in Pakistan 2026",
    "65W GaN charger Pakistan",
    "20000mAh power bank",
    "cash on delivery electronics",
  ],
  alternates: {
    canonical: "/blog",
    languages: storeAlternatesLanguages("/blog").languages,
  },
  openGraph: {
    title: "Buy n Try buying guides",
    description:
      "Practical Pakistan guides for earbuds, GaN chargers, power banks, and COD.",
    type: "website",
  },
};

export const revalidate = 60;

export default async function BlogPage() {
  let posts: Page[] = [];
  try {
    posts = await fetchBlogPosts(isDemoSession());
  } catch {
    posts = [];
  }

  if (posts.length === 0) {
    posts = FALLBACK_BLOG_POSTS;
  }
  posts = sortBlogPostsForHome(posts, "popular");
  const siteUrl = publicSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Buy n Try buying guides",
    url: `${siteUrl}/blog`,
    description:
      "Pakistan-first guides to TWS earbuds, 65W GaN chargers, power banks, and cash on delivery electronics.",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.seo?.title || post.title,
      url: `${siteUrl}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      description: post.seo?.description || post.excerpt,
    })),
  };

  return (
    <div
      className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="border-b border-[var(--g-line)]">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
            Blog
          </p>
          <h1 className="gadget-display mt-3 text-4xl tracking-[-0.03em] text-[var(--g-charcoal)] sm:text-5xl">
            Pakistan buying guides
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--g-taupe)] sm:text-base">
            How to pick TWS earbuds, 65W GaN chargers, 20,000mAh power banks,
            and calling watches when you are paying cash on delivery.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        {posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] transition hover:border-[var(--g-forest)]"
              >
                <div className="aspect-[16/9] overflow-hidden bg-[var(--g-cream-deep)]">
                  {post.coverImage ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={imageUrl(post.coverImage, { w: 800 })}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--g-taupe)]">
                      No cover image
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-3 text-xs text-[var(--g-taupe)]">
                    {post.publishedAt ? (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(post.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    ) : null}
                    {post.author ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="font-semibold leading-snug text-[var(--g-charcoal)] group-hover:text-[var(--g-forest)]">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="line-clamp-3 text-sm text-[var(--g-taupe)]">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--g-line)] bg-[var(--g-white)] p-12 text-center text-[var(--g-taupe)]">
            No blog posts yet. Publish a guide in Admin → Blog.
          </p>
        )}
      </div>
    </div>
  );
}
