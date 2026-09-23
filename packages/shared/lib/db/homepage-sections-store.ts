import { revalidateAfterPublish } from "@/lib/revalidate-storefront";

import { mapProduct } from "@/lib/db/map";
import { slugify } from "@/lib/db/publish";
import { getServiceClient } from "@/lib/supabase/server";
import type { HomepageSection, HomepageSectionLayout, HomepageSectionSource, Product } from "@/lib/types";

function db() {
  return getServiceClient();
}

const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

export interface HomepageSectionDoc {
  title: string;
  subtitle?: string;
  slug?: string;
  sourceType: HomepageSectionSource;
  categoryId?: string;
  productLimit?: number;
  layout: HomepageSectionLayout;
  showViewAll?: boolean;
  viewAllHref?: string;
  isActive?: boolean;
  sortOrder?: number;
  manualProductIds?: string[];
}

export function validateHomepageSectionDoc(doc: HomepageSectionDoc) {
  const title = doc.title?.trim() ?? "";
  if (!title) {
    return { ok: false as const, error: "Section title is required.", status: 400 };
  }

  const validSources: HomepageSectionSource[] = ["manual", "category", "newest", "sale"];
  if (!validSources.includes(doc.sourceType)) {
    return { ok: false as const, error: "Invalid product source type.", status: 400 };
  }

  const validLayouts: HomepageSectionLayout[] = ["grid", "carousel"];
  if (!validLayouts.includes(doc.layout)) {
    return { ok: false as const, error: "Invalid layout type.", status: 400 };
  }

  if (doc.sourceType === "category" && !doc.categoryId?.trim()) {
    return { ok: false as const, error: "Category is required for category sections.", status: 400 };
  }

  const limit = Number(doc.productLimit ?? 8);
  if (!Number.isInteger(limit) || limit < 1 || limit > 40) {
    return { ok: false as const, error: "Product limit must be between 1 and 40.", status: 400 };
  }

  if (doc.viewAllHref?.trim()) {
    const href = doc.viewAllHref.trim();
    if (!href.startsWith("/") || href.startsWith("//") || /^(javascript|data|vbscript):/i.test(href)) {
      return {
        ok: false as const,
        error: "View All link must be a safe internal relative path (e.g. /products).",
        status: 400,
      };
    }
  }

  return { ok: true as const, title, limit };
}

export async function listAdminHomepageSections(): Promise<HomepageSection[]> {
  const { data: sections, error } = await db()
    .from("homepage_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw error;
  }

  if (!sections?.length) return [];

  // Fetch product counts for manual sections
  const manualSectionIds = sections
    .filter((s) => s.source_type === "manual")
    .map((s) => s.id);

  const manualCounts: Record<string, number> = {};
  if (manualSectionIds.length) {
    const { data: rels } = await db()
      .from("homepage_section_products")
      .select("section_id")
      .in("section_id", manualSectionIds);

    for (const r of rels ?? []) {
      manualCounts[r.section_id] = (manualCounts[r.section_id] ?? 0) + 1;
    }
  }

  return sections.map((s) => ({
    id: String(s.id),
    title: String(s.title ?? ""),
    subtitle: s.subtitle ? String(s.subtitle) : undefined,
    slug: String(s.slug ?? ""),
    sourceType: s.source_type as HomepageSectionSource,
    categoryId: s.category_id ? String(s.category_id) : undefined,
    productLimit: Number(s.product_limit ?? 8),
    layout: s.layout as HomepageSectionLayout,
    showViewAll: Boolean(s.show_view_all),
    viewAllHref: s.view_all_href ? String(s.view_all_href) : undefined,
    isActive: Boolean(s.is_active),
    sortOrder: Number(s.sort_order ?? 0),
    manualProductIds: [],
  }));
}

export async function getAdminHomepageSection(id: string): Promise<HomepageSection | null> {
  const { data: section, error } = await db()
    .from("homepage_sections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!section) return null;

  const { data: rels } = await db()
    .from("homepage_section_products")
    .select("product_id")
    .eq("section_id", id)
    .order("sort_order", { ascending: true });

  const manualProductIds = (rels ?? []).map((r) => String(r.product_id));

  return {
    id: String(section.id),
    title: String(section.title ?? ""),
    subtitle: section.subtitle ? String(section.subtitle) : undefined,
    slug: String(section.slug ?? ""),
    sourceType: section.source_type as HomepageSectionSource,
    categoryId: section.category_id ? String(section.category_id) : undefined,
    productLimit: Number(section.product_limit ?? 8),
    layout: section.layout as HomepageSectionLayout,
    showViewAll: Boolean(section.show_view_all),
    viewAllHref: section.view_all_href ? String(section.view_all_href) : undefined,
    isActive: Boolean(section.is_active),
    sortOrder: Number(section.sort_order ?? 0),
    manualProductIds,
  };
}

export async function createAdminHomepageSection(doc: HomepageSectionDoc) {
  const validation = validateHomepageSectionDoc(doc);
  if (!validation.ok) return validation;

  const baseSlug = doc.slug?.trim() ? slugify(doc.slug) : slugify(validation.title);
  const slug = baseSlug || `section-${Date.now()}`;

  const { data: maxSort } = await db()
    .from("homepage_sections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = doc.sortOrder ?? Number(maxSort?.sort_order ?? 0) + 1;

  const { data, error } = await db()
    .from("homepage_sections")
    .insert({
      title: validation.title,
      subtitle: doc.subtitle?.trim() || null,
      slug,
      source_type: doc.sourceType,
      category_id: doc.categoryId?.trim() || null,
      product_limit: validation.limit,
      layout: doc.layout,
      show_view_all: doc.showViewAll ?? true,
      view_all_href: doc.viewAllHref?.trim() || null,
      is_active: doc.isActive ?? true,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "A section with that slug already exists.", status: 409 };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }

  const sectionId = String(data.id);

  if (doc.sourceType === "manual" && doc.manualProductIds?.length) {
    const rows = doc.manualProductIds.map((pid, idx) => ({
      section_id: sectionId,
      product_id: pid,
      sort_order: idx + 1,
    }));
    await db().from("homepage_section_products").insert(rows);
  }

  void revalidateAfterPublish("/");
  return { ok: true as const, id: sectionId };
}

export async function saveAdminHomepageSection(id: string, doc: HomepageSectionDoc) {
  const current = await getAdminHomepageSection(id);
  if (!current) {
    return { ok: false as const, error: "Homepage section not found.", status: 404 };
  }

  const validation = validateHomepageSectionDoc(doc);
  if (!validation.ok) return validation;

  const slug = doc.slug?.trim() ? slugify(doc.slug) : current.slug;

  const { error } = await db()
    .from("homepage_sections")
    .update({
      title: validation.title,
      subtitle: doc.subtitle?.trim() || null,
      slug,
      source_type: doc.sourceType,
      category_id: doc.categoryId?.trim() || null,
      product_limit: validation.limit,
      layout: doc.layout,
      show_view_all: doc.showViewAll ?? true,
      view_all_href: doc.viewAllHref?.trim() || null,
      is_active: doc.isActive ?? true,
      sort_order: doc.sortOrder ?? current.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message, status: 500 };

  // Replace manual products
  await db().from("homepage_section_products").delete().eq("section_id", id);

  if (doc.sourceType === "manual" && doc.manualProductIds?.length) {
    const rows = doc.manualProductIds.map((pid, idx) => ({
      section_id: id,
      product_id: pid,
      sort_order: idx + 1,
    }));
    await db().from("homepage_section_products").insert(rows);
  }

  void revalidateAfterPublish("/");
  return { ok: true as const };
}

export async function deleteAdminHomepageSection(id: string) {
  const { error } = await db().from("homepage_sections").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateAfterPublish("/");
  return { ok: true as const };
}

export async function reorderAdminHomepageSections(orderedIds: string[]) {
  if (!Array.isArray(orderedIds)) {
    return { ok: false as const, error: "Invalid section list.", status: 400 };
  }

  for (let i = 0; i < orderedIds.length; i++) {
    await db()
      .from("homepage_sections")
      .update({ sort_order: i + 1 })
      .eq("id", orderedIds[i]);
  }

  void revalidateAfterPublish("/");
  return { ok: true as const };
}

export async function fetchPublicHomepageSections(): Promise<HomepageSection[]> {
  const { data: rawSections, error } = await db()
    .from("homepage_sections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw error;
  }

  if (!rawSections?.length) return [];

  const result: HomepageSection[] = [];

  for (const s of rawSections) {
    let resolvedProducts: Product[] = [];
    const limit = Number(s.product_limit ?? 8);
    const sourceType = s.source_type as HomepageSectionSource;

    if (sourceType === "manual") {
      const { data: rels } = await db()
        .from("homepage_section_products")
        .select("product_id")
        .eq("section_id", s.id)
        .order("sort_order", { ascending: true });

      const pids = (rels ?? []).map((r) => String(r.product_id));
      if (pids.length) {
        const { data: prods } = await db()
          .from("products")
          .select(PRODUCT_EMBED)
          .in("id", pids)
          .eq("status", "published")
          .or("is_demo.eq.false,is_demo.is.null");

        const map = new Map<string, Product>();
        for (const p of prods ?? []) {
          const mapped = mapProduct(p as Record<string, unknown>);
          if (mapped) map.set(mapped._id, mapped);
        }

        // Preserve exact manual sort order
        resolvedProducts = pids
          .map((id) => map.get(id))
          .filter((p): p is Product => Boolean(p))
          .slice(0, limit);
      }
    } else if (sourceType === "category") {
      const category = String(s.category_id ?? "");
      if (category) {
        const { data: prods } = await db()
          .from("products")
          .select(PRODUCT_EMBED)
          .eq("category", category)
          .eq("status", "published")
          .or("is_demo.eq.false,is_demo.is.null")
          .limit(limit);

        resolvedProducts = (prods ?? [])
          .map((p) => mapProduct(p as Record<string, unknown>))
          .filter((p): p is Product => Boolean(p));
      }
    } else if (sourceType === "newest") {
      const { data: prods } = await db()
        .from("products")
        .select(PRODUCT_EMBED)
        .eq("status", "published")
        .or("is_demo.eq.false,is_demo.is.null")
        .order("created_at", { ascending: false })
        .limit(limit);

      resolvedProducts = (prods ?? [])
        .map((p) => mapProduct(p as Record<string, unknown>))
        .filter((p): p is Product => Boolean(p));
    } else if (sourceType === "sale") {
      const { data: prods } = await db()
        .from("products")
        .select(PRODUCT_EMBED)
        .eq("status", "published")
        .or("is_demo.eq.false,is_demo.is.null")
        .not("compare_at_price", "is", null)
        .limit(limit);

      resolvedProducts = (prods ?? [])
        .map((p) => mapProduct(p as Record<string, unknown>))
        .filter((p): p is Product => Boolean(p))
        .filter((p) => Boolean(p.compareAtPrice && p.compareAtPrice > p.price));
    }

    // Skip section if 0 products resolved
    if (resolvedProducts.length > 0) {
      let viewAllHref = s.view_all_href ? String(s.view_all_href) : undefined;
      if (!viewAllHref && s.show_view_all) {
        if (sourceType === "category" && s.category_id) {
          viewAllHref = `/products/${s.category_id}`;
        } else {
          viewAllHref = "/products";
        }
      }

      result.push({
        id: String(s.id),
        title: String(s.title ?? ""),
        subtitle: s.subtitle ? String(s.subtitle) : undefined,
        slug: String(s.slug ?? ""),
        sourceType,
        categoryId: s.category_id ? String(s.category_id) : undefined,
        productLimit: limit,
        layout: s.layout as HomepageSectionLayout,
        showViewAll: Boolean(s.show_view_all),
        viewAllHref,
        isActive: Boolean(s.is_active),
        sortOrder: Number(s.sort_order ?? 0),
        resolvedProducts,
      });
    }
  }

  return result;
}
