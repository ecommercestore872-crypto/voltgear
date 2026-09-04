"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import type { Page } from "@/lib/types";
import { imageUrl } from "@/lib/sanity/image";

export type BlogCardPost = {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt?: string;
};

const FALLBACK_POSTS: BlogCardPost[] = [
  {
    slug: "gaming-earbuds-travel",
    title: "Gaming Earbuds for Travel: Compact and Portable Gaming Solutions",
    excerpt:
      "Looking for the best gaming earbuds for travel? Check out these compact, portable options that deliver immersive sound on the go.",
    publishedAt: "2024-03-21",
  },
  {
    slug: "watch-face-studio-guide",
    title: "How To Create Watch Faces Using The Watch Face Studio",
    excerpt:
      "Learn how to design custom watch faces with Watch Face Studio — a step-by-step guide for beginners and enthusiasts.",
    publishedAt: "2024-03-18",
  },
  {
    slug: "anc-headphones-productivity",
    title: "ANC for Work: How Noise-Cancelling Headphones Can Boost Productivity",
    excerpt:
      "Discover how active noise cancellation helps you focus deeper, cut distractions, and get more done every day.",
    publishedAt: "2024-03-12",
  },
  {
    slug: "gps-smartwatch-parents-guide",
    title: "A Parent's Guide to GPS Smartwatches: What to Look For",
    excerpt:
      "Choosing a GPS watch for your child? Here’s what matters — safety features, battery life, and comfort.",
    publishedAt: "2024-03-05",
  },
];

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toCards(posts: Page[]): BlogCardPost[] {
  return posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImage: p.coverImage ? imageUrl(p.coverImage, { w: 800 }) : undefined,
    publishedAt: p.publishedAt,
  }));
}

function coverGradient(i: number) {
  const tones = [
    "from-[#1f3626] to-[#3d5c48]",
    "from-[#25392a] to-[#8fa888]",
    "from-[#1a1a1a] to-[#5c6b5a]",
    "from-[#2a4032] to-[#efeae0]",
  ];
  return tones[i % tones.length];
}

export function GadgetBlogSection({ posts }: { posts: Page[] }) {
  const [tab, setTab] = useState<"popular" | "latest">("popular");

  const source = useMemo(() => {
    const real = toCards(posts);
    return real.length ? real : FALLBACK_POSTS;
  }, [posts]);

  const usingFallback = posts.length === 0;

  const visible = useMemo(() => {
    const list = [...source];
    if (tab === "latest") {
      list.sort((a, b) => {
        const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return tb - ta;
      });
    } else {
      // “Popular”: prefer posts with covers, then keep a stable alternate order
      list.sort((a, b) => Number(Boolean(b.coverImage)) - Number(Boolean(a.coverImage)));
    }
    return list.slice(0, 8);
  }, [source, tab]);

  return (
    <section
      className="gadget-band-clay px-4 py-10 sm:py-14 lg:px-8"
      aria-labelledby="gadget-blogs-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="gadget-blogs-heading"
              className="text-2xl font-bold tracking-tight text-[var(--g-charcoal)] sm:text-3xl"
            >
              Blogs
            </h2>
            <div className="mt-3 flex items-center gap-2" role="tablist" aria-label="Blog filter">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "popular"}
                onClick={() => setTab("popular")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === "popular"
                    ? "bg-[var(--g-forest)] text-[var(--g-white)]"
                    : "text-[var(--g-taupe)] hover:text-[var(--g-charcoal)]"
                }`}
              >
                Popular
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "latest"}
                onClick={() => setTab("latest")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === "latest"
                    ? "bg-[var(--g-forest)] text-[var(--g-white)]"
                    : "text-[var(--g-taupe)] hover:text-[var(--g-charcoal)]"
                }`}
              >
                Latest
              </button>
            </div>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--g-sage)] transition hover:text-[var(--g-forest)]"
          >
            View All
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
              <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-4 pb-1 sm:gap-5">
            {visible.map((post, i) => {
              const date = formatDate(post.publishedAt);
              const href = usingFallback ? "/blog" : `/blog/${post.slug}`;
              return (
                <li key={`${tab}-${post.slug}`} className="w-[16.5rem] shrink-0 sm:w-[17.5rem] lg:w-[18.25rem]">
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(31,54,38,0.1)]">
                    <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-[var(--g-cream-deep)]">
                      {post.coverImage ? (
                        <Image
                          src={post.coverImage}
                          alt=""
                          fill
                          quality={88}
                          sizes="292px"
                          className="object-cover transition duration-500 hover:scale-[1.03]"
                        />
                      ) : (
                        <span
                          className={`absolute inset-0 bg-gradient-to-br ${coverGradient(i)}`}
                          aria-hidden
                        />
                      )}
                      {!post.coverImage ? (
                        <span className="absolute inset-0 flex items-end p-4">
                          <span className="line-clamp-2 text-sm font-semibold text-[var(--g-white)]">
                            {post.title}
                          </span>
                        </span>
                      ) : null}
                    </Link>

                    <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                      {date ? (
                        <p className="text-[12px] text-[var(--g-taupe)]">{date}</p>
                      ) : null}
                      <Link href={href}>
                        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[var(--g-charcoal)]">
                          {post.title}
                        </h3>
                      </Link>
                      {post.excerpt ? (
                        <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--g-taupe)]">
                          {post.excerpt}
                        </p>
                      ) : null}
                      <div className="flex-1" />
                      <Link
                        href={href}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[var(--g-line)] bg-[var(--g-white)] text-[13px] font-semibold text-[var(--g-charcoal)] transition hover:border-[var(--g-forest)] hover:text-[var(--g-forest)]"
                      >
                        Read More
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </span>
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
