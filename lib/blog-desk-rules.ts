import { blogInventoryReadyForAds, sanitizeBlogSections } from "@/lib/blog-safety-rules";
import type { ContentBlock, Page } from "@/lib/types";

export type PageSeo = {
  title?: string;
  description?: string;
  featured?: boolean;
  homeOrder?: number;
};

export type BlogDeskDoc = {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  keywords?: string[];
  seo?: PageSeo;
  sections?: ContentBlock[];
};

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 160;

export function normalizePageSeo(raw: unknown): PageSeo {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const title = typeof rec.title === "string" ? rec.title.trim() : undefined;
  const description = typeof rec.description === "string" ? rec.description.trim() : undefined;
  const featured = rec.featured === true;
  const order = Number(rec.homeOrder);
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(featured ? { featured: true } : {}),
    ...(Number.isFinite(order) ? { homeOrder: Math.max(0, Math.round(order)) } : {}),
  };
}

export function blogSeoDefaults(input: {
  title: string;
  excerpt?: string;
  keywords?: string[];
}): PageSeo {
  const title = input.title.trim().slice(0, SEO_TITLE_MAX);
  const description = (input.excerpt ?? "").trim().slice(0, SEO_DESC_MAX);
  return {
    title,
    description,
  };
}

export function validateBlogDoc(doc: BlogDeskDoc): { ok: true } | { ok: false; error: string } {
  if (!doc.title?.trim()) return { ok: false, error: "Title is required." };
  if (!doc.slug?.trim()) return { ok: false, error: "Slug is required." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug.trim())) {
    return { ok: false, error: "Slug must be lowercase letters, numbers, and hyphens." };
  }
  if ((doc.excerpt ?? "").trim().length < 40) {
    return { ok: false, error: "Write an excerpt of at least 40 characters for search snippets." };
  }
  if ((doc.seo?.title ?? doc.title).trim().length > SEO_TITLE_MAX) {
    return { ok: false, error: `SEO title must stay under ${SEO_TITLE_MAX} characters.` };
  }
  if ((doc.seo?.description ?? "").trim().length > SEO_DESC_MAX) {
    return { ok: false, error: `SEO description must stay under ${SEO_DESC_MAX} characters.` };
  }
  const sections = sanitizeBlogSections(doc.sections);
  if (sections.length < 4) {
    return { ok: false, error: "Add at least four body sections so the guide is useful, not thin." };
  }
  const inventory = blogInventoryReadyForAds({
    title: doc.title,
    excerpt: doc.excerpt,
    coverImage: doc.coverImage,
    sections,
  });
  if (!inventory.ok) return inventory;
  return { ok: true };
}

export function sortBlogPostsForHome(
  posts: Page[],
  tab: "popular" | "latest"
): Page[] {
  const list = [...posts];
  if (tab === "latest") {
    list.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });
    return list;
  }
  list.sort((a, b) => {
    const fa = a.seo?.featured ? 1 : 0;
    const fb = b.seo?.featured ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const oa = a.seo?.homeOrder ?? 99;
    const ob = b.seo?.homeOrder ?? 99;
    if (oa !== ob) return oa - ob;
    return Number(Boolean(b.coverImage)) - Number(Boolean(a.coverImage));
  });
  return list;
}
