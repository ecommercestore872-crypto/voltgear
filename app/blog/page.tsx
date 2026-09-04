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

export const metadata: Metadata = {
  title: "Blog & Buying Guides",
  description: "Electronics buying guides, tech news and tips from Buy n Try.",
  openGraph: {
    title: "Blog & Buying Guides | Buy n Try",
    description: "Electronics buying guides, tech news and tips from Buy n Try.",
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

  return (
    <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
      <div className="border-b border-[var(--g-line)]">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
            Blog
          </p>
          <h1 className="gadget-display mt-3 text-4xl tracking-[-0.03em] text-[var(--g-charcoal)] sm:text-5xl">
            Guides, news &amp; tips
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--g-taupe)] sm:text-base">
            Practical picks and how-tos for chargers, audio, and everyday tech.
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
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
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
                    <p className="line-clamp-3 text-sm text-[var(--g-taupe)]">{post.excerpt}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--g-line)] bg-[var(--g-white)] p-12 text-center text-[var(--g-taupe)]">
            No blog posts yet. Create posts in Admin (Page Type: Blog).
          </p>
        )}
      </div>
    </div>
  );
}
