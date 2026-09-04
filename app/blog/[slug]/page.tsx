import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, User } from "lucide-react";

import {
  GadgetArticleShell,
} from "@/components/gadget/gadget-article-shell";
import { ContentBlocks } from "@/components/sections/content-blocks";
import { fetchBlogPosts, fetchPageBySlug } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { publicSiteUrl } from "@/lib/deploy-rules";
import { imageUrl } from "@/lib/sanity/image";
import type { ContentBlock, Page } from "@/lib/types";

import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const posts = await fetchBlogPosts();
    const list = posts.length > 0 ? posts : FALLBACK_BLOG_POSTS;
    return list.map((post) => ({ slug: post.slug }));
  } catch {
    return FALLBACK_BLOG_POSTS.map((post) => ({ slug: post.slug }));
  }
}

function readingMinutes(blocks: ContentBlock[] | undefined): number {
  if (!blocks?.length) return 0;
  const text = blocks
    .map((b) => {
      if (b._type === "paragraph" || b._type === "callout" || b._type === "quote")
        return b.text ?? "";
      if (b._type === "list") return (b.items ?? []).join(" ");
      if (b._type === "heading") return b.text ?? "";
      return "";
    })
    .join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  let post: Page | null = null;
  try {
    post = await fetchPageBySlug(params.slug, isDemoSession());
  } catch {
    post = null;
  }
  if (!post) {
    post = FALLBACK_BLOG_POSTS.find((p) => p.slug === params.slug) ?? null;
  }
  if (!post) return {};
  const cover = post.coverImage ? imageUrl(post.coverImage, { w: 1200 }) : null;
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    keywords: post.keywords?.length ? post.keywords.join(", ") : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.seo?.title || post.title,
      description: post.seo?.description || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author] : undefined,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  let post: Page | null = null;
  try {
    post = await fetchPageBySlug(params.slug, isDemoSession());
  } catch {
    post = null;
  }

  if (!post) {
    post = FALLBACK_BLOG_POSTS.find((p) => p.slug === params.slug) ?? null;
  }

  if (!post || post.pageType !== "blog") notFound();

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Draft";
  const mins = readingMinutes(post.sections);
  const siteUrl = publicSiteUrl();
  const cover = post.coverImage ? imageUrl(post.coverImage, { w: 1200 }) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    image: cover || undefined,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Person", name: post.author || "Buy n Try Team" },
    publisher: {
      "@type": "Organization",
      name: "Buy n Try",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    keywords: post.keywords?.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GadgetArticleShell
        eyebrow="Blog"
        title={post.title}
        description={post.excerpt}
        coverUrl={cover}
        backHref="/blog"
        backLabel="Back to all guides"
      >
        <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--g-line)] pb-5 text-sm text-[var(--g-taupe)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--g-forest)] text-base font-bold text-[var(--g-white)]">
            {(post.author || "V")[0].toUpperCase()}
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-[var(--g-charcoal)]">
              <User className="h-3.5 w-3.5" />
              {post.author || "Buy n Try Team"}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {publishedDate}
              </span>
              {mins > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {mins} min read
                </span>
              ) : null}
            </p>
          </div>
          <Link href="/" className="ml-auto text-xs font-semibold text-[var(--g-forest)] hover:underline">
            Shop
          </Link>
        </div>

        {post.sections && post.sections.length > 0 ? (
          <ContentBlocks blocks={post.sections} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--g-line)] bg-[var(--g-white)] p-8 text-center text-[var(--g-taupe)]">
            This post has no content yet.
          </p>
        )}
      </GadgetArticleShell>
    </>
  );
}
