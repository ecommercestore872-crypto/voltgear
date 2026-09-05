import { revalidatePath } from "next/cache";

import type { AdminProduct } from "@/lib/db/admin-types";
import { mapProduct } from "@/lib/db/map";
import {
  canPublish,
  canSaveDraft,
  mergeApprovedReview,
  mergeProductForm,
  slugify,
  slugTaken,
  toImageRows,
  toLiveProductRow,
  toReviewRows,
  toVariantRows,
  withGeneratedVariants,
  type ProductDocument,
} from "@/lib/db/publish";
import { missingSchemaColumn, omitColumn } from "@/lib/db/product-column-fallback";
import { sanitizeChromeLinks, validateChromeLists } from "@/lib/chrome-nav-rules";
import { parseAutopilotConfig, type AutopilotConfig } from "@/lib/autopilot/config";
import { parseOrderEmailConfig, type OrderEmailConfig } from "@/lib/order-email-cms-rules";
import {
  mergeInvoiceTemplate,
  invoiceTemplateOverrides,
  type InvoiceTemplate,
} from "@/lib/invoice-template-rules";
import { canDeleteShopType, canSaveShopType, extraCategoryPathsToRevalidate, shopTypeSlugTaken } from "@/lib/db/category-rules";
import { canPublishHome, canPublishSlide, MAX_HERO_SLIDES } from "@/lib/db/hero-slide-rules";
import {
  normalizeHomeSections,
  type HomeSectionEntry,
} from "@/lib/db/home-section-rules";
import type { ShopType } from "@/lib/categories";
import { getServiceClient } from "@/lib/supabase/server";
import type { Product, SiteSettings } from "@/lib/types";

const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

function db() {
  return getServiceClient();
}

function asStatus(v: unknown): AdminProduct["status"] {
  if (v === "draft" || v === "unpublished" || v === "published") return v;
  return "published";
}

function asDraft(v: unknown): ProductDocument | null {
  if (!v || typeof v !== "object") return null;
  return v as ProductDocument;
}

function toAdminProduct(row: Record<string, unknown> | null): AdminProduct | null {
  if (!row) return null;
  const product = mapProduct(row, { includeDemoReviews: true });
  if (!product) return null;
  return {
    ...product,
    status: asStatus(row.status),
    draft: asDraft(row.draft),
    costPrice: row.cost_price != null && Number.isFinite(Number(row.cost_price)) ? Number(row.cost_price) : undefined,
  };
}

export function productToDocument(product: Product, costPrice?: number): ProductDocument {
  return {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    sku: product.sku,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images ?? [],
    cloudinaryImages: product.cloudinaryImages,
    shortDescription: product.shortDescription,
    description: product.description,
    features: product.features,
    specifications: product.specifications,
    compatibility: product.compatibility,
    inTheBox: product.inTheBox,
    productVideo: product.productVideo,
    variants: product.variants,
    colorEnabled: product.colorEnabled,
    sizeEnabled: product.sizeEnabled,
    colorOptions: product.colorOptions,
    sizeOptions: product.sizeOptions,
    productFaq: product.productFaq,
    stockStatus: product.stockStatus,
    quantity: product.quantity,
    rating: product.rating,
    reviewCount: product.reviewCount,
    reviews: product.reviews,
    featured: product.featured,
    badge: product.badge,
    isDemo: product.isDemo,
    costPrice,
  };
}

export function editorDocument(product: AdminProduct): ProductDocument {
  const doc = product.draft ?? productToDocument(product, product.costPrice);
  return { ...doc, costPrice: doc.costPrice ?? product.costPrice };
}

async function allProductSlugs() {
  const { data, error } = await db().from("products").select("id, slug");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), slug: String(r.slug) }));
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_EMBED)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => toAdminProduct(row as Record<string, unknown>))
    .filter(Boolean) as AdminProduct[];
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_EMBED)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return toAdminProduct(data as Record<string, unknown> | null);
}

export async function createAdminProduct(doc: ProductDocument) {
  const merged = mergeProductForm(undefined, doc);
  const save = canSaveDraft(merged, await assignableCategoryRefs());
  if (!save.ok) return { ok: false as const, error: save.error, status: 400 };
  if (slugTaken(merged.slug, await allProductSlugs())) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const { data, error } = await db()
    .from("products")
    .insert({
      name: merged.name.trim(),
      slug: merged.slug.trim(),
      category: merged.category.trim(),
      price: Number.isFinite(merged.price) ? merged.price : 0,
      stock_status: merged.stockStatus || "in-stock",
      quantity:
        merged.quantity != null && Number.isInteger(merged.quantity) && merged.quantity >= 0
          ? merged.quantity
          : null,
      status: "draft",
      draft: merged,
      is_demo: Boolean(merged.isDemo),
      cost_price:
        merged.costPrice != null && Number.isFinite(merged.costPrice) && merged.costPrice >= 0
          ? merged.costPrice
          : null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "That slug is already used.", status: 409 };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminProduct(id: string, doc: ProductDocument) {
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const merged = mergeProductForm(editorDocument(current), doc);
  const save = canSaveDraft(merged, await assignableCategoryRefs());
  if (!save.ok) return { ok: false as const, error: save.error, status: 400 };
  if (slugTaken(merged.slug, await allProductSlugs(), id)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const { error } = await db()
    .from("products")
    .update({
      draft: merged,
      is_demo: Boolean(merged.isDemo),
      cost_price:
        merged.costPrice != null && Number.isFinite(merged.costPrice) && merged.costPrice >= 0
          ? merged.costPrice
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

async function replaceProductChildren(id: string, doc: ProductDocument) {
  await db().from("product_images").delete().eq("product_id", id);
  await db().from("product_variants").delete().eq("product_id", id);
  await db().from("product_reviews").delete().eq("product_id", id);
  const images = toImageRows(id, doc.images ?? []);
  const variants = toVariantRows(id, doc.variants);
  const reviews = toReviewRows(id, doc.reviews);
  if (images.length) {
    const { error } = await db().from("product_images").insert(images);
    if (error) throw error;
  }
  if (variants.length) {
    const { error } = await db().from("product_variants").insert(variants);
    if (error) throw error;
  }
  if (reviews.length) {
    const { error } = await db().from("product_reviews").insert(reviews);
    if (error) throw error;
  }
}

async function writeLiveProductRow(
  id: string,
  row: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  let payload: Record<string, unknown> = { ...row, updated_at: new Date().toISOString() };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await db().from("products").update(payload).eq("id", id);
    if (!error) return { ok: true };
    if (error.code === "23505") {
      return { ok: false, error: "That slug is already used.", status: 409 };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return { ok: false, error: "Product columns are missing on the database.", status: 500 };
}

export async function publishAdminProduct(id: string, doc: ProductDocument) {
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const merged = withGeneratedVariants(mergeProductForm(editorDocument(current), doc));
  const gate = canPublish(merged, await assignableCategoryRefs());
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  if (slugTaken(merged.slug, await allProductSlugs(), id)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const row = toLiveProductRow(merged);
  const written = await writeLiveProductRow(id, row);
  if (!written.ok) return written;
  try {
    await replaceProductChildren(id, merged);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Publish failed while updating media.",
      status: 500,
    };
  }
  revalidatePath("/");
  revalidatePath("/products");
  for (const path of extraCategoryPathsToRevalidate(current.category, merged.category)) {
    revalidatePath(path);
  }
  revalidatePath(`/product/${merged.slug}`);
  revalidatePath("/search");
  revalidatePath("/api/store/products");
  if (current.slug !== merged.slug) revalidatePath(`/product/${current.slug}`);
  return { ok: true as const };
}

export async function unpublishAdminProduct(id: string) {
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const { error } = await db()
    .from("products")
    .update({ status: "unpublished", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/product/${current.slug}`);
  revalidatePath("/api/store/products");
  return { ok: true as const };
}

export async function discardAdminProductDraft(id: string) {
  const { error } = await db()
    .from("products")
    .update({ draft: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function deleteAdminProduct(id: string) {
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const { error } = await db().from("products").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/product/${current.slug}`);
  revalidatePath("/api/store/products");
  return { ok: true as const };
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
  seo?: { title?: string; description?: string };
  isDemo?: boolean;
};

export async function listAdminPages() {
  const { data, error } = await db().from("pages").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminPage(id: string) {
  const { data, error } = await db().from("pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAdminPage(doc: PageDoc) {
  if (!doc.title?.trim() || !doc.slug?.trim()) {
    return { ok: false as const, error: "Title and slug are required.", status: 400 };
  }
  const { data, error } = await db()
    .from("pages")
    .insert({
      title: doc.title.trim(),
      slug: doc.slug.trim(),
      page_type: doc.pageType || "static",
      status: "draft",
      draft: doc,
      is_demo: Boolean(doc.isDemo),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false as const, error: "That slug is already used.", status: 409 };
    return { ok: false as const, error: error.message, status: 500 };
  }
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminPage(id: string, doc: PageDoc) {
  if (!doc.title?.trim() || !doc.slug?.trim()) {
    return { ok: false as const, error: "Title and slug are required.", status: 400 };
  }
  const { error } = await db()
    .from("pages")
    .update({ draft: doc, is_demo: Boolean(doc.isDemo), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function publishAdminPage(id: string, doc: PageDoc) {
  if (!doc.title?.trim() || !doc.slug?.trim()) {
    return { ok: false as const, error: "Title and slug are required.", status: 400 };
  }
  const { error } = await db()
    .from("pages")
    .update({
      title: doc.title.trim(),
      slug: doc.slug.trim(),
      page_type: doc.pageType || "static",
      excerpt: doc.excerpt ?? null,
      cover_image_url: doc.coverImage ?? null,
      published_at: doc.publishedAt || new Date().toISOString(),
      author: doc.author ?? null,
      sections: doc.sections ?? [],
      keywords: doc.keywords ?? [],
      seo: doc.seo ?? null,
      is_demo: Boolean(doc.isDemo),
      status: "published",
      draft: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false as const, error: "That slug is already used.", status: 409 };
    return { ok: false as const, error: error.message, status: 500 };
  }
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/${doc.slug}`);
  revalidatePath(`/blog/${doc.slug}`);
  return { ok: true as const };
}

export async function unpublishAdminPage(id: string) {
  const page = await getAdminPage(id);
  const { error } = await db()
    .from("pages")
    .update({ status: "unpublished", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (page?.slug) {
    revalidatePath(`/${page.slug}`);
    revalidatePath(`/blog/${page.slug}`);
  }
  return { ok: true as const };
}

export async function discardAdminPageDraft(id: string) {
  const { error } = await db().from("pages").update({ draft: null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function deleteAdminPage(id: string) {
  const { error } = await db().from("pages").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function getAdminHero() {
  const { data, error } = await db().from("hero_sections").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAdminHero(draft: Record<string, unknown>) {
  const { error } = await db().from("hero_sections").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function publishAdminHero(doc: Record<string, unknown>) {
  const backgroundImages = Array.isArray(doc.backgroundImages)
    ? (doc.backgroundImages as string[]).filter((url): url is string => Boolean(url))
    : doc.backgroundImage
    ? [String(doc.backgroundImage)]
    : [];
  const primaryBgImage = backgroundImages[0] ?? (doc.backgroundImage ? String(doc.backgroundImage) : null);

  const payload: Record<string, unknown> = {
    id: 1,
    headline: doc.headline ?? "",
    subheadline: doc.subheadline ?? null,
    background_image_url: primaryBgImage,
    background_images: backgroundImages.length ? backgroundImages : null,
    background_video: doc.backgroundVideo ?? null,
    primary_cta: doc.primaryCta ?? null,
    secondary_cta: doc.secondaryCta ?? null,
    stats: doc.stats ?? null,
    featured_product_id: doc.featuredProductId || null,
    status: "published",
    draft: null,
  };

  let { error } = await db().from("hero_sections").upsert(payload, { onConflict: "id" });
  if (error && error.code === "42703") {
    delete payload.background_images;
    const fallbackRes = await db().from("hero_sections").upsert(payload, { onConflict: "id" });
    error = fallbackRes.error;
  }

  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  return { ok: true as const };
}

export async function unpublishAdminHero() {
  const { error } = await db().from("hero_sections").update({ status: "unpublished" }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  return { ok: true as const };
}

export async function discardAdminHeroDraft() {
  const { error } = await db().from("hero_sections").update({ draft: null }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export type HeroSlideDoc = {
  productId: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  sortOrder?: number;
  isDemo?: boolean;
};

export async function listAdminHeroSlides() {
  const { data, error } = await db()
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const productIds = Array.from(
    new Set(rows.map((r) => String(r.product_id ?? "")).filter(Boolean))
  );
  const { data: products } = await db()
    .from("products")
    .select("id, name, slug, stock_status")
    .in("id", productIds);
  const byId = new Map((products ?? []).map((p) => [String(p.id), p]));

  return rows.map((row) => ({
    ...row,
    products: byId.get(String(row.product_id)) ?? null,
  }));
}

export async function getHomePublishBlockers() {
  const [{ count: slideCount, error: sErr }, { count: testimonialCount, error: tErr }] =
    await Promise.all([
      db()
        .from("hero_slides")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      db()
        .from("testimonials")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
    ]);
  if (sErr || tErr) {
    return canPublishHome({
      publishedSlideCount: 0,
      publishedTestimonialCount: 0,
    }).blockers;
  }
  return canPublishHome({
    publishedSlideCount: slideCount ?? 0,
    publishedTestimonialCount: testimonialCount ?? 0,
  }).blockers;
}

export async function createAdminHeroSlide(doc: HeroSlideDoc) {
  const check = canPublishSlide({ imageUrl: doc.imageUrl, productId: doc.productId });
  if (!check.ok) return { ok: false as const, error: check.reason ?? "Invalid slide.", status: 400 };

  const { count } = await db()
    .from("hero_slides")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");
  // drafts unrestricted; published capped at create-as-published only via publish action

  const { data: maxRow } = await db()
    .from("hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = doc.sortOrder ?? (Number(maxRow?.sort_order ?? -1) + 1);

  const { data, error } = await db()
    .from("hero_slides")
    .insert({
      product_id: doc.productId,
      image_url: doc.imageUrl.trim(),
      title: doc.title?.trim() || null,
      subtitle: doc.subtitle?.trim() || null,
      sort_order: sortOrder,
      status: "draft",
      is_demo: Boolean(doc.isDemo),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void count;
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return { ok: true as const, id: data.id as string, slide: data };
}

export async function updateAdminHeroSlide(id: string, doc: HeroSlideDoc) {
  const check = canPublishSlide({ imageUrl: doc.imageUrl, productId: doc.productId });
  if (!check.ok) return { ok: false as const, error: check.reason ?? "Invalid slide.", status: 400 };
  const { error } = await db()
    .from("hero_slides")
    .update({
      product_id: doc.productId,
      image_url: doc.imageUrl.trim(),
      title: doc.title?.trim() || null,
      subtitle: doc.subtitle?.trim() || null,
      sort_order: doc.sortOrder ?? 0,
      is_demo: Boolean(doc.isDemo),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return { ok: true as const };
}

export async function publishAdminHeroSlide(id: string, doc?: HeroSlideDoc) {
  if (doc) {
    const saved = await updateAdminHeroSlide(id, doc);
    if (!saved.ok) return saved;
  }
  const { data: row, error: readErr } = await db().from("hero_slides").select("*").eq("id", id).maybeSingle();
  if (readErr) return { ok: false as const, error: readErr.message, status: 500 };
  if (!row) return { ok: false as const, error: "Slide not found.", status: 404 };
  const check = canPublishSlide({
    imageUrl: String(row.image_url ?? ""),
    productId: String(row.product_id ?? ""),
  });
  if (!check.ok) return { ok: false as const, error: check.reason ?? "Invalid slide.", status: 400 };

  const { count } = await db()
    .from("hero_slides")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .neq("id", id);
  if ((count ?? 0) >= MAX_HERO_SLIDES) {
    return {
      ok: false as const,
      error: `At most ${MAX_HERO_SLIDES} published hero slides.`,
      status: 400,
    };
  }

  const { error } = await db()
    .from("hero_slides")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return { ok: true as const };
}

export async function unpublishAdminHeroSlide(id: string) {
  const { error } = await db()
    .from("hero_slides")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return { ok: true as const };
}

export async function deleteAdminHeroSlide(id: string) {
  const { error } = await db().from("hero_slides").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return { ok: true as const };
}

export async function reorderAdminHeroSlides(orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db()
      .from("hero_slides")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", orderedIds[i]);
    if (error) return { ok: false as const, error: error.message, status: 500 };
  }
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return { ok: true as const };
}

export async function getAdminSettings() {
  const { data, error } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

function settingsLiveRow(doc: Partial<SiteSettings> & Record<string, unknown>) {
  return {
    id: 1,
    brand_name: doc.brandName ?? "Store",
    tagline: doc.tagline ?? null,
    logo_url: doc.logo ?? null,
    primary_color: doc.primaryColor ?? null,
    secondary_color: doc.secondaryColor ?? null,
    theme: doc.theme ?? null,
    heading_font: doc.headingFont ?? null,
    body_font: doc.bodyFont ?? null,
    currency: doc.currency ?? null,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
    address: doc.address ?? null,
    social_links: doc.socialLinks ?? null,
    free_shipping_threshold: doc.freeShippingThreshold ?? null,
    shipping_fee: doc.shippingFee ?? null,
    return_policy: doc.returnPolicy ?? null,
    warranty_info: doc.warrantyInfo ?? null,
    cod_enabled: doc.codEnabled ?? true,
    whatsapp_number: doc.whatsappNumber ?? null,
    warranty_months: doc.warrantyMonths ?? null,
    return_window_days: doc.returnWindowDays ?? null,
    announcement: doc.announcement ?? null,
    seo: doc.seo ?? null,
    nav_links: Array.isArray(doc.navLinks) ? sanitizeChromeLinks(doc.navLinks) : null,
    help_links: Array.isArray(doc.helpLinks) ? sanitizeChromeLinks(doc.helpLinks) : null,
    footer_company_links: Array.isArray(doc.footerCompanyLinks)
      ? sanitizeChromeLinks(doc.footerCompanyLinks)
      : null,
    footer_care_links: Array.isArray(doc.footerCareLinks)
      ? sanitizeChromeLinks(doc.footerCareLinks)
      : null,
    status: "published",
    draft: null,
    ...(doc.orderEmails ? { order_emails: parseOrderEmailConfig(doc.orderEmails) } : {}),
    ...(doc.invoiceTemplate ? { invoice_template: mergeInvoiceTemplate(doc.invoiceTemplate) } : {}),
  };
}

export async function saveAdminSettings(draft: Record<string, unknown>) {
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function publishAdminSettings(doc: Record<string, unknown>) {
  const gate = validateChromeLists(doc);
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  const current = await getAdminSettings();
  const currentDraft =
    current?.draft && typeof current.draft === "object"
      ? (current.draft as Record<string, unknown>)
      : null;
  const leftover =
    !doc.orderEmails && currentDraft?.orderEmails
      ? { orderEmails: parseOrderEmailConfig(currentDraft.orderEmails) }
      : null;
  let payload: Record<string, unknown> = { ...settingsLiveRow(doc), draft: leftover };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await db().from("site_settings").upsert(payload, { onConflict: "id" });
    if (!error) {
      revalidatePath("/", "layout");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return { ok: false as const, error: "Settings columns are missing on the database.", status: 500 };
}

export function editorOrderEmails(row: Record<string, unknown> | null): OrderEmailConfig {
  const draft = row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  if (draft?.orderEmails) return parseOrderEmailConfig(draft.orderEmails);
  return parseOrderEmailConfig(row?.order_emails);
}

export async function saveAdminOrderEmails(config: OrderEmailConfig) {
  const current = await getAdminSettings();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>), orderEmails: parseOrderEmailConfig(config) }
      : { orderEmails: parseOrderEmailConfig(config) };
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

async function stripOrderEmailsDraft() {
  const current = await getAdminSettings();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : null;
  if (!draft || !("orderEmails" in draft)) return;
  delete draft.orderEmails;
  await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
}

export async function publishAdminOrderEmails(config: OrderEmailConfig) {
  const parsed = parseOrderEmailConfig(config);
  let payload: Record<string, unknown> = {
    order_emails: parsed,
    updated_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      if ("order_emails" in payload) await stripOrderEmailsDraft();
      revalidatePath("/", "layout");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return { ok: false as const, error: "Order email columns are missing on the database.", status: 500 };
}

export function editorAutopilot(row: Record<string, unknown> | null): AutopilotConfig {
  return parseAutopilotConfig(row?.autopilot);
}

export async function publishAdminAutopilot(config: AutopilotConfig) {
  const parsed = parseAutopilotConfig(config);
  let payload: Record<string, unknown> = {
    autopilot: parsed,
    updated_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      if (!("autopilot" in payload)) {
        return {
          ok: false as const,
          error: "Run supabase/migrations/20260905060000_autopilot.sql on Supabase.",
          status: 500,
        };
      }
      revalidatePath("/admin/autopilot/settings");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return { ok: false as const, error: "Autopilot column is missing on the database.", status: 500 };
}

export async function discardAdminOrderEmails() {
  const current = await getAdminSettings();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : {};
  if (!("orderEmails" in draft)) return { ok: true as const };
  delete draft.orderEmails;
  const { error } = await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export function editorInvoiceTemplate(row: Record<string, unknown> | null): InvoiceTemplate {
  const draft = row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  if (draft?.invoiceTemplate) return mergeInvoiceTemplate(draft.invoiceTemplate);
  return mergeInvoiceTemplate(row?.invoice_template);
}

export async function saveAdminInvoiceTemplate(config: InvoiceTemplate | Partial<InvoiceTemplate>) {
  const current = await getAdminSettings();
  const parsed = invoiceTemplateOverrides(config);
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>), invoiceTemplate: parsed }
      : { invoiceTemplate: parsed };
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

async function stripInvoiceTemplateDraft() {
  const current = await getAdminSettings();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : null;
  if (!draft || !("invoiceTemplate" in draft)) return;
  delete draft.invoiceTemplate;
  await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
}

export async function publishAdminInvoiceTemplate(config: InvoiceTemplate | Partial<InvoiceTemplate>) {
  const parsed = invoiceTemplateOverrides(config);
  let payload: Record<string, unknown> = {
    invoice_template: parsed,
    updated_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      if ("invoice_template" in payload) await stripInvoiceTemplateDraft();
      revalidatePath("/", "layout");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return {
    ok: false as const,
    error: "Invoice template column is missing. Push migration 20260905080000_invoice_template.sql.",
    status: 500,
  };
}

export async function discardAdminInvoiceTemplate() {
  const current = await getAdminSettings();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : {};
  if (!("invoiceTemplate" in draft)) return { ok: true as const };
  delete draft.invoiceTemplate;
  const { error } = await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function discardAdminSettingsDraft() {
  const { error } = await db().from("site_settings").update({ draft: null }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function saveAdminHomeSections(sections: HomeSectionEntry[]) {
  const normalized = normalizeHomeSections(sections);
  const { error } = await db()
    .from("site_settings")
    .update({ home_sections: normalized })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  revalidatePath("/admin/home");
  return { ok: true as const, sections: normalized };
}

type TestimonialDoc = {
  customerName: string;
  reviewText: string;
  rating: number;
  product?: string;
  verified?: boolean;
  isDemo?: boolean;
};

export async function listAdminTestimonials() {
  const { data, error } = await db()
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminTestimonial(id: string) {
  const { data, error } = await db().from("testimonials").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAdminTestimonial(doc: TestimonialDoc) {
  if (!doc.customerName?.trim() || !doc.reviewText?.trim()) {
    return { ok: false as const, error: "Name and review text are required.", status: 400 };
  }
  const { data, error } = await db()
    .from("testimonials")
    .insert({
      customer_name: doc.customerName.trim(),
      review_text: doc.reviewText.trim(),
      rating: doc.rating || 5,
      status: "draft",
      draft: doc,
      is_demo: Boolean(doc.isDemo),
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminTestimonial(id: string, doc: TestimonialDoc) {
  const { error } = await db()
    .from("testimonials")
    .update({ draft: doc, is_demo: Boolean(doc.isDemo) })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function publishAdminTestimonial(id: string, doc: TestimonialDoc) {
  if (!doc.customerName?.trim() || !doc.reviewText?.trim()) {
    return { ok: false as const, error: "Name and review text are required.", status: 400 };
  }
  const { error } = await db()
    .from("testimonials")
    .update({
      customer_name: doc.customerName.trim(),
      review_text: doc.reviewText.trim(),
      rating: doc.rating || 5,
      product: doc.product ?? null,
      verified: Boolean(doc.verified),
      is_demo: Boolean(doc.isDemo),
      status: "published",
      draft: null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  return { ok: true as const };
}

export async function unpublishAdminTestimonial(id: string) {
  const { error } = await db().from("testimonials").update({ status: "unpublished" }).eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  return { ok: true as const };
}

export async function discardAdminTestimonialDraft(id: string) {
  const { error } = await db().from("testimonials").update({ draft: null }).eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function deleteAdminTestimonial(id: string) {
  const { error } = await db().from("testimonials").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/");
  return { ok: true as const };
}

export async function listReviewSubmissions() {
  const { data, error } = await db()
    .from("review_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function moderateReview(id: string, action: "approve" | "reject") {
  const { data: submission, error: loadError } = await db()
    .from("review_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return { ok: false as const, error: loadError.message, status: 500 };
  if (!submission) return { ok: false as const, error: "Review not found.", status: 404 };

  if (action === "reject") {
    const { error } = await db().from("review_submissions").update({ status: "rejected" }).eq("id", id);
    if (error) return { ok: false as const, error: error.message, status: 500 };
    return { ok: true as const };
  }

  const productId = String(submission.product_id);
  const approved = {
    name: submission.name ? String(submission.name) : undefined,
    rating: submission.rating != null ? Number(submission.rating) : undefined,
    date: new Date().toISOString(),
    comment: submission.comment ? String(submission.comment) : undefined,
    verified: Boolean(submission.verified),
    image: submission.image ? String(submission.image) : undefined,
    isDemo: Boolean(submission.is_demo),
  };
  const product = await getAdminProduct(productId);
  if (!product) return { ok: false as const, error: "Product not found.", status: 404 };
  const liveReviews = product.reviews ?? [];
  const merged = mergeApprovedReview(product.draft, liveReviews, approved);
  await db().from("product_reviews").insert({
    product_id: productId,
    name: approved.name ?? null,
    rating: approved.rating ?? null,
    review_date: approved.date,
    comment: approved.comment ?? null,
    verified: Boolean(approved.verified),
    image: approved.image ?? null,
    is_demo: Boolean(submission.is_demo),
  });
  await db()
    .from("products")
    .update({
      draft: merged.draft,
      review_count: (product.reviewCount ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  await db().from("review_submissions").update({ status: "approved" }).eq("id", id);
  revalidatePath(`/product/${product.slug}`);
  return { ok: true as const };
}

export async function deleteReview(id: string) {
  // Remove from review_submissions (the queue)
  const { error: subErr } = await db().from("review_submissions").delete().eq("id", id);
  if (subErr) return { ok: false as const, error: subErr.message, status: 500 };
  // Also remove from product_reviews if it was approved there
  await db().from("product_reviews").delete().eq("submission_id", id).then(() => {});
  return { ok: true as const };
}

export type DemoPurgeResult = {
  ok: true;
  empty: boolean;
  deleted: {
    review_submissions: number;
    reviews: number;
    orders: number;
    testimonials: number;
    pages: number;
    products: number;
  };
};

async function deleteDemoRows(table: string): Promise<number> {
  const { count, error } = await db().from(table).delete({ count: "exact" }).eq("is_demo", true);
  if (error) throw error;
  return count ?? 0;
}

export async function purgeDemoData(): Promise<DemoPurgeResult> {
  const deleted = {
    review_submissions: await deleteDemoRows("review_submissions"),
    reviews: await deleteDemoRows("product_reviews"),
    orders: await deleteDemoRows("orders"),
    testimonials: await deleteDemoRows("testimonials"),
    pages: await deleteDemoRows("pages"),
    products: await deleteDemoRows("products"),
  };
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/search");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/products");
  revalidatePath("/admin/pages");
  revalidatePath("/admin/testimonials");
  revalidatePath("/admin/reviews");
  return {
    ok: true,
    empty: Object.values(deleted).every((n) => n === 0),
    deleted,
  };
}

function revalidateShopTypePaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/products/${slug}`);
}

function mapCategoryRow(
  row: Record<string, unknown>,
  counts: Record<string, number>
): ShopType {
  const slug = String(row.slug);
  return {
    id: String(row.id),
    name: String(row.name),
    slug,
    description: String(row.description ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    sortOrder: Number(row.sort_order ?? 0),
    productCount: counts[slug] ?? 0,
  };
}

async function productCountsByCategory(): Promise<Record<string, number>> {
  const { data, error } = await db().from("products").select("category");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const slug = String(row.category || "");
    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}

async function allShopTypeSlugs() {
  const { data, error } = await db().from("categories").select("id, slug");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), slug: String(r.slug) }));
}

async function assignableCategoryRefs(): Promise<{ slug: string }[]> {
  try {
    return await allShopTypeSlugs();
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
    if (code === "42P01") return [];
    throw err;
  }
}

export async function listAdminShopTypes(): Promise<ShopType[]> {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    if (error.code === "42P01") {
      throw new Error("Shop types are not in the database yet. Ask to push the database change.");
    }
    throw error;
  }
  const counts = await productCountsByCategory();
  return (data ?? []).map((row) => mapCategoryRow(row as Record<string, unknown>, counts));
}

export async function getAdminShopType(id: string): Promise<ShopType | null> {
  const { data, error } = await db().from("categories").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const counts = await productCountsByCategory();
  return mapCategoryRow(data as Record<string, unknown>, counts);
}

export async function createAdminShopType(doc: {
  name?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}) {
  const name = doc.name?.trim() ?? "";
  const slug = slugify(name);
  const gate = canSaveShopType({ name, slug });
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  if (shopTypeSlugTaken(slug, await allShopTypeSlugs())) {
    return { ok: false as const, error: "That shop type name is already used.", status: 409 };
  }
  const { data: last } = await db()
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder =
    doc.sortOrder != null && Number.isFinite(doc.sortOrder)
      ? Number(doc.sortOrder)
      : Number(last?.sort_order ?? 0) + 1;
  const { data, error } = await db()
    .from("categories")
    .insert({
      name,
      slug,
      description: doc.description?.trim() || null,
      image_url: doc.imageUrl?.trim() || null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "That shop type name is already used.", status: 409 };
    }
    if (error.code === "42P01") {
      return {
        ok: false as const,
        error: "Shop types are not in the database yet. Ask to push the database change.",
        status: 500,
      };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }
  revalidateShopTypePaths(slug);
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminShopType(
  id: string,
  doc: { name?: string; description?: string; imageUrl?: string; sortOrder?: number }
) {
  const current = await getAdminShopType(id);
  if (!current) return { ok: false as const, error: "Shop type not found.", status: 404 };
  const name = doc.name?.trim() ?? "";
  const gate = canSaveShopType({ name, slug: current.slug });
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  const { error } = await db()
    .from("categories")
    .update({
      name,
      description: doc.description?.trim() || null,
      image_url: doc.imageUrl?.trim() || null,
      sort_order:
        doc.sortOrder != null && Number.isFinite(Number(doc.sortOrder))
          ? Number(doc.sortOrder)
          : current.sortOrder,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidateShopTypePaths(current.slug);
  return { ok: true as const };
}

export async function deleteAdminShopType(id: string) {
  const current = await getAdminShopType(id);
  if (!current) return { ok: false as const, error: "Shop type not found.", status: 404 };
  const blocked = canDeleteShopType(current.productCount ?? 0);
  if (!blocked.ok) return { ok: false as const, error: blocked.error, status: 409 };
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidateShopTypePaths(current.slug);
  return { ok: true as const };
}

export async function fetchProductCostRows(): Promise<
  { slug: string; name: string; category: string; costPrice: number | null }[]
> {
  const { data, error } = await db().from("products").select("slug, name, category, cost_price");
  if (error) {
    if (error.code === "42703") {
      const fallback = await db().from("products").select("slug, name, category");
      return (fallback.data ?? []).map((r) => ({
        slug: String(r.slug ?? ""),
        name: String(r.name ?? ""),
        category: String(r.category ?? ""),
        costPrice: null,
      }));
    }
    throw error;
  }
  return (data ?? []).map((r) => ({
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    category: String(r.category ?? ""),
    costPrice: r.cost_price != null && Number.isFinite(Number(r.cost_price)) ? Number(r.cost_price) : null,
  }));
}

export type SavedAnalyticsReport = {
  id: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
};

export async function listSavedAnalyticsReports(): Promise<SavedAnalyticsReport[]> {
  const { data, error } = await db()
    .from("analytics_saved_reports")
    .select("id, name, query, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    query: (r.query && typeof r.query === "object" ? r.query : {}) as Record<string, unknown>,
    createdAt: String(r.created_at ?? ""),
  }));
}

export async function createSavedAnalyticsReport(name: string, query: Record<string, unknown>) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Name the report.", status: 400 };
  const { data, error } = await db()
    .from("analytics_saved_reports")
    .insert({ name: trimmed, query })
    .select("id")
    .single();
  if (error) {
    if (error.code === "42P01") {
      return { ok: false as const, error: "Saved reports are not in the database yet.", status: 500 };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }
  return { ok: true as const, id: String(data.id) };
}

export async function deleteSavedAnalyticsReport(id: string) {
  const { error } = await db().from("analytics_saved_reports").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

