import { unstable_cache } from "next/cache";

import { revalidateAdminCacheTag } from "@/lib/revalidate-storefront";
import type { AdminProduct } from "@/lib/db/admin-types";
import { mapProduct } from "@/lib/db/map";
import { type ProductDocument } from "@/lib/db/publish";
import { getServiceClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const PRODUCT_EDITOR_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default )
`;

const PRODUCT_EMBED = `${PRODUCT_EDITOR_EMBED},
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

function db() {
  return getServiceClient({ admin: true });
}

function asStatus(value: unknown): AdminProduct["status"] {
  if (value === "draft" || value === "unpublished" || value === "published") return value;
  return "published";
}

function asDraft(value: unknown): ProductDocument | null {
  if (!value || typeof value !== "object") return null;
  return value as ProductDocument;
}

function toAdminProduct(row: Record<string, unknown> | null): AdminProduct | null {
  if (!row) return null;
  const product = mapProduct(row, { includeDemoReviews: true });
  if (!product) return null;
  return {
    ...product,
    status: asStatus(row.status),
    draft: asDraft(row.draft),
    costPrice:
      row.cost_price != null && Number.isFinite(Number(row.cost_price))
        ? Number(row.cost_price)
        : undefined,
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
    instagramUrl: product.instagramUrl,
    tiktokUrl: product.tiktokUrl,
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

export async function isProductSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const normalized = slug.trim();
  if (!normalized) return false;
  let query = db().from("products").select("id").eq("slug", normalized).limit(1);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function bumpAdminProductsCache() {
  revalidateAdminCacheTag("admin-products");
}

const ADMIN_PRODUCT_GRID_SELECT =
  "id, name, slug, category, price, cost_price, compare_at_price, stock_status, quantity, status, is_demo, updated_at, product_images ( url, sort_order )";
const ADMIN_PRODUCT_LIST_EMBED = `${ADMIN_PRODUCT_GRID_SELECT}, draft`;
const ADMIN_PRODUCT_DASHBOARD_SELECT =
  "id, name, stock_status, status, is_demo, updated_at";
const ADMIN_PRODUCT_LITE_SELECT =
  "id, name, slug, category, price, stock_status, quantity, status, is_demo, updated_at";
const ADMIN_PRODUCT_SEARCH_LIMIT = 120;
function cleanAdminProductSearch(term: string): string {
  return term.replace(/[,%_()\\"*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
const STOCK_ATTENTION_STATUSES = ["low-stock", "out-of-stock"] as const;

export const ADMIN_PRODUCTS_PAGE_SIZE = 48;

export type AdminProductDashboardRow = {
  _id: string;
  name: string;
  stockStatus: string;
  status: AdminProduct["status"];
  isDemo: boolean;
};

export type AdminProductPickerRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
};

export type AdminDashboardCatalogMetrics = {
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; stockStatus: string }[];
  draftProductCount: number;
  firstDraftProductId: string | null;
};

export async function listAdminProductsForDashboard(): Promise<AdminProductDashboardRow[]> {
  const { data, error } = await db()
    .from("products")
    .select(ADMIN_PRODUCT_DASHBOARD_SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    _id: String(row.id),
    name: String(row.name ?? ""),
    stockStatus: String(row.stock_status ?? "in-stock"),
    status: asStatus(row.status),
    isDemo: Boolean(row.is_demo),
  }));
}

export async function fetchAdminDashboardCatalogMetrics(): Promise<AdminDashboardCatalogMetrics> {
  const client = db();
  const [
    { count: lowStockCount, error: lowError },
    { data: lowRows, error: lowRowsError },
    { count: draftCount, error: draftError },
    { data: firstDraft, error: firstDraftError },
  ] = await Promise.all([
    client
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_demo", false)
      .eq("status", "published")
      .in("stock_status", [...STOCK_ATTENTION_STATUSES]),
    client
      .from("products")
      .select(ADMIN_PRODUCT_DASHBOARD_SELECT)
      .eq("is_demo", false)
      .eq("status", "published")
      .in("stock_status", [...STOCK_ATTENTION_STATUSES])
      .order("updated_at", { ascending: false })
      .limit(8),
    client.from("products").select("*", { count: "exact", head: true }).neq("status", "published"),
    client
      .from("products")
      .select("id")
      .neq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (lowError) throw lowError;
  if (lowRowsError) throw lowRowsError;
  if (draftError) throw draftError;
  if (firstDraftError) throw firstDraftError;
  return {
    lowStockCount: lowStockCount ?? 0,
    lowStockProducts: (lowRows ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      stockStatus: String(row.stock_status ?? "in-stock"),
    })),
    draftProductCount: draftCount ?? 0,
    firstDraftProductId: firstDraft?.id ? String(firstDraft.id) : null,
  };
}

export async function countPendingReviewSubmissions(): Promise<number> {
  const { count, error } = await db()
    .from("review_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function listAdminProductPickers(): Promise<AdminProductPickerRow[]> {
  const { data, error } = await db()
    .from("products")
    .select("id, name, slug, category, price, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    category: String(row.category ?? ""),
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
  }));
}

export async function listAdminProductsLite(): Promise<AdminProduct[]> {
  const { data, error } = await db()
    .from("products")
    .select(ADMIN_PRODUCT_LITE_SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => toAdminProduct(row as Record<string, unknown>))
    .filter(Boolean) as AdminProduct[];
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await db()
    .from("products")
    .select(ADMIN_PRODUCT_LIST_EMBED)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => toAdminProduct(row as Record<string, unknown>))
    .filter(Boolean) as AdminProduct[];
}

export async function countAdminProducts(options?: {
  category?: string;
  stockAttention?: boolean;
}): Promise<number> {
  let query = db().from("products").select("*", { count: "exact", head: true });
  if (options?.category) query = query.eq("category", options.category);
  if (options?.stockAttention) query = query.in("stock_status", [...STOCK_ATTENTION_STATUSES]);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function productIdsWithUnpublishedDraft(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return new Set();
  const { data, error } = await db()
    .from("products")
    .select("id")
    .in("id", unique)
    .not("draft", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((row) => String(row.id)));
}

async function finalizeAdminProductGridRows(rows: Record<string, unknown>[]): Promise<AdminProduct[]> {
  const products = rows
    .map((row) => toAdminProduct(row))
    .filter(Boolean) as AdminProduct[];
  const draftIds = await productIdsWithUnpublishedDraft(products.map((product) => product._id));
  return products.map((product) => ({
    ...product,
    draft: null,
    hasUnpublishedDraft: draftIds.has(product._id),
  }));
}

export async function listAdminProductsPageWithCount(options: {
  page: number;
  pageSize?: number;
  q?: string;
  category?: string;
  stockAttention?: boolean;
}): Promise<{ products: AdminProduct[]; total: number; page: number; pageSize: number }> {
  const requestedPageSize = options.pageSize ?? ADMIN_PRODUCTS_PAGE_SIZE;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(100, Math.max(1, Math.trunc(requestedPageSize)))
    : ADMIN_PRODUCTS_PAGE_SIZE;
  const page = Number.isFinite(options.page) ? Math.min(1_000_000, Math.max(1, Math.trunc(options.page))) : 1;
  const term = options.q?.trim() ?? "";
  const cleaned = cleanAdminProductSearch(term);
  if (term.length >= 2 && cleaned.length < 2) {
    return { products: [], total: 0, page, pageSize };
  }
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = db().from("products").select(ADMIN_PRODUCT_GRID_SELECT, { count: "exact" });
  if (cleaned.length >= 2) {
    const pattern = `%${cleaned}%`;
    query = query.or(`name.ilike.${pattern},slug.ilike.${pattern},category.ilike.${pattern}`);
  }
  if (options.category) query = query.eq("category", options.category);
  if (options.stockAttention) query = query.in("stock_status", [...STOCK_ATTENTION_STATUSES]);
  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw error;
  return {
    products: await finalizeAdminProductGridRows((data ?? []) as Record<string, unknown>[]),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listAdminProductsPage(
  options: Parameters<typeof listAdminProductsPageWithCount>[0],
): Promise<AdminProduct[]> {
  return (await listAdminProductsPageWithCount(options)).products;
}

async function listAdminProductCategoryCountsUncached(): Promise<{ slug: string; count: number }[]> {
  const { data, error } = await db().from("products").select("category");
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const slug = String((row as { category?: string }).category ?? "").trim();
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count);
}

export async function listAdminProductCategoryCounts(): Promise<{ slug: string; count: number }[]> {
  return unstable_cache(listAdminProductCategoryCountsUncached, ["admin-product-category-counts"], {
    revalidate: 300,
    tags: ["admin-products"],
  })();
}

export async function listAdminProductsByIds(ids: string[]): Promise<AdminProduct[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await db()
    .from("products")
    .select(ADMIN_PRODUCT_LITE_SELECT)
    .in("id", unique);
  if (error) throw error;
  return (data ?? [])
    .map((row) => toAdminProduct(row as Record<string, unknown>))
    .filter(Boolean) as AdminProduct[];
}

export async function listAdminProductsSearch(term: string): Promise<AdminProduct[]> {
  const cleaned = cleanAdminProductSearch(term);
  if (cleaned.length < 2) return [];
  const pattern = `%${cleaned}%`;
  const { data, error } = await db()
    .from("products")
    .select(ADMIN_PRODUCT_GRID_SELECT)
    .or(`name.ilike.${pattern},slug.ilike.${pattern},category.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(ADMIN_PRODUCT_SEARCH_LIMIT);
  if (error) throw error;
  return finalizeAdminProductGridRows((data ?? []) as Record<string, unknown>[]);
}

export async function listAdminProductsForCommandSearch(
  term: string,
): Promise<{ id: string; name: string; slug: string }[]> {
  const cleaned = cleanAdminProductSearch(term);
  if (cleaned.length < 2) return [];
  const pattern = `%${cleaned}%`;
  const { data, error } = await db()
    .from("products")
    .select("id, name, slug")
    .or(`name.ilike.${pattern},slug.ilike.${pattern},category.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(ADMIN_PRODUCT_SEARCH_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
  }));
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

export async function getAdminProductForEditor(id: string): Promise<AdminProduct | null> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_EDITOR_EMBED)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return toAdminProduct(data as Record<string, unknown> | null);
}

export async function getAdminProductForDraftSave(id: string): Promise<AdminProduct | null> {
  const { data, error } = await db().from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  if (row.draft && typeof row.draft === "object") return toAdminProduct(row);
  return getAdminProduct(id);
}
