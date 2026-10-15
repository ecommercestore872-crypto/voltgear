import { sanitizeBlogSections } from "@/lib/blog-safety-rules";
import { revalidateAfterPublish } from "@/lib/revalidate-storefront";
import { getServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/db/publish";
import type { ContentBlock } from "@/lib/types";

function db() {
  return getServiceClient({ admin: true });
}

type PageDoc = {
  title: string;
  slug: string;
  pageType?: "static" | "blog";
  excerpt?: string;
  coverImage?: string;
  publishedAt?: string;
  author?: string;
  sections?: unknown[];
  keywords?: string[];
  seo?: {
    title?: string;
    description?: string;
    featured?: boolean;
    homeOrder?: number;
  };
  isDemo?: boolean;
};

const ADMIN_PAGE_LIST_SELECT =
  "id, title, slug, page_type, status, draft, seo, updated_at";

function validatePageDoc(doc: PageDoc | null | undefined) {
  const title = typeof doc?.title === "string" ? doc.title.trim() : "";
  const slug = slugify(typeof doc?.slug === "string" ? doc.slug : "");
  if (!title || !slug) return { ok: false as const, error: "Title and a valid slug are required.", status: 400 };
  if (title.length > 160 || slug.length > 120) return { ok: false as const, error: "Title or slug is too long.", status: 400 };
  if (doc?.pageType && doc.pageType !== "static" && doc.pageType !== "blog") {
    return { ok: false as const, error: "Invalid page type.", status: 400 };
  }
  return { ok: true as const, title, slug };
}

/** List pages for admin index screens without loading sections/body JSON. */
export async function listAdminPagesIndex(options?: {
  pageType?: "static" | "blog";
}) {
  let query = db()
    .from("pages")
    .select(ADMIN_PAGE_LIST_SELECT)
    .order("updated_at", { ascending: false });
  if (options?.pageType) query = query.eq("page_type", options.pageType);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAdminPages() {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminPage(id: string) {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAdminPage(doc: PageDoc) {
  const validation = validatePageDoc(doc);
  if (!validation.ok) return validation;
  const { data, error } = await db()
    .from("pages")
    .insert({
      title: validation.title,
      slug: validation.slug,
      page_type: doc.pageType || "static",
      status: "draft",
      draft: doc,
      is_demo: Boolean(doc.isDemo),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false as const,
        error: "That slug is already used.",
        status: 409,
      };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminPage(id: string, doc: PageDoc) {
  const validation = validatePageDoc(doc);
  if (!validation.ok) return validation;
  const { data, error } = await db()
    .from("pages")
    .update({
      draft: doc,
      is_demo: Boolean(doc.isDemo),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (!data) return { ok: false as const, error: "Page not found.", status: 404 };
  return { ok: true as const };
}

export async function publishAdminPage(id: string, doc: PageDoc) {
  const validation = validatePageDoc(doc);
  if (!validation.ok) return validation;
  const previous = await getAdminPage(id);
  if (!previous) return { ok: false as const, error: "Page not found.", status: 404 };
  const { error } = await db()
    .from("pages")
    .update({
      title: validation.title,
      slug: validation.slug,
      page_type: doc.pageType || "static",
      excerpt: doc.excerpt ?? null,
      cover_image_url: doc.coverImage ?? null,
      published_at: doc.publishedAt || new Date().toISOString(),
      author: doc.author ?? null,
      sections: doc.sections
        ? sanitizeBlogSections(doc.sections as ContentBlock[])
        : [],
      keywords: doc.keywords ?? [],
      seo: doc.seo ?? null,
      is_demo: Boolean(doc.isDemo),
      status: "published",
      draft: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false as const,
        error: "That slug is already used.",
        status: 409,
      };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }
  void revalidateAfterPublish("/", "/blog", `/${validation.slug}`, `/blog/${validation.slug}`,
    ...(previous.slug && previous.slug !== validation.slug ? [`/${previous.slug}`, `/blog/${previous.slug}`] : []));
  return { ok: true as const };
}

export async function unpublishAdminPage(id: string) {
  const page = await getAdminPage(id);
  const { error } = await db()
    .from("pages")
    .update({
      status: "unpublished",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (page?.slug) {
    void revalidateAfterPublish(`/${page.slug}`, `/blog/${page.slug}`);
  }
  return { ok: true as const };
}

export async function discardAdminPageDraft(id: string) {
  const { error } = await db()
    .from("pages")
    .update({ draft: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function deleteAdminPage(id: string) {
  const page = await getAdminPage(id);
  if (!page) return { ok: false as const, error: "Page not found.", status: 404 };
  const { error } = await db().from("pages").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (page.slug) void revalidateAfterPublish("/", "/blog", `/${page.slug}`, `/blog/${page.slug}`);
  return { ok: true as const };
}
