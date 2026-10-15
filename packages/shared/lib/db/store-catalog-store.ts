import { unstable_cache } from "next/cache";
import { cache } from "react";

import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import { resolveCategoryImagePath } from "@/lib/category-image-resolve";
import { categoryIsStorefrontVisible } from "@/lib/catalog-visibility-rules";
import { ensureFallbackShopTypes } from "@/lib/db/admin-store";
import { pickBestsellers } from "@/lib/db/bestsellers-rules";
import {
  db,
  demoFilter,
  execDemoQuery,
  LIVE,
} from "@/lib/db/store-query-foundation";
import { mapPdpDetailFields, mapProduct } from "@/lib/db/map";
import { pdpProductCacheTag } from "@/lib/gadget-pdp-lcp";
import {
  STOREFRONT_CATALOG_GRID_CACHE_TAG,
  STOREFRONT_CATALOG_REVALIDATE,
  STOREFRONT_HOMEPAGE_CATALOG_CACHE_TAG,
  STOREFRONT_SHOP_TYPES_CACHE_TAG,
} from "@/lib/storefront-cache";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 12;

export const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

/** Card/rail fields only — keeps catalog HTML and RSC payloads small for conversion speed. */
export const CATALOG_PRODUCT_EMBED =
  "id, name, slug, category, price, compare_at_price, cloudinary_images, short_description, sku, brand, stock_status, quantity, rating, review_count, featured, badge, is_demo, status, created_at, product_images ( url, sort_order, source ), product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default )";

/** PDP above-the-fold: buy box + gallery — excludes long JSON copy (loaded in deferred chunk). */
const PDP_SHELL_EMBED = `
  id, name, slug, category, price, compare_at_price, cloudinary_images, short_description, sku, brand,
  stock_status, quantity, rating, review_count, featured, badge, is_demo, status, free_shipping,
  color_enabled, size_enabled, color_options, size_options, product_video,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default )
`;

const PDP_DETAILS_EMBED =
  "id, description, features, specifications, compatibility, in_the_box, product_faq, product_video, addons";

export function mapStoreProduct(
  row: Record<string, unknown>,
  opts?: { includeDemoReviews?: boolean },
): Product | null {
  return mapProduct(row, { ...opts, storefront: true });
}

async function queryActiveCategorySlugs(): Promise<string[] | null> {
  const { data, error } = await db()
    .from("categories")
    .select("slug")
    .eq("active", true);
  if (error) throw error;
  if (!data?.length) return null;
  const slugs = data.map((r) => String(r.slug ?? "").trim()).filter(Boolean);
  return slugs.length > 0 ? slugs : null;
}

const getActiveCategorySlugsCached = unstable_cache(
  queryActiveCategorySlugs,
  ["storefront-active-category-slugs-v1"],
  {
    revalidate: STOREFRONT_CATALOG_REVALIDATE,
    tags: [STOREFRONT_SHOP_TYPES_CACHE_TAG],
  },
);

/** Active shop categories from CMS; null = no rows (do not filter by category). */
const loadActiveCategorySlugSet = cache(async (): Promise<Set<string> | null> => {
  const slugs = await getActiveCategorySlugsCached();
  if (!slugs) return null;
  return new Set(slugs);
});

function sanitizeCatalogSearchQuery(raw: string): string {
  return raw.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function filterForActiveCategories(
  products: Product[],
  active: Set<string> | null,
): Product[] {
  if (!active) return products;
  return products.filter((p) => active.has(p.category));
}

export async function fetchAllProducts(includeDemo = false): Promise<Product[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("products").select(PRODUCT_EMBED).eq("status", LIVE),
      includeDemo
    ).order("created_at", { ascending: false })
  );
  if (error) throw error;
  return filterForActiveCategories(
    (data ?? [])
      .map((row) => mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
      .filter(Boolean) as Product[],
    await loadActiveCategorySlugSet(),
  );
}

async function loadCatalogProducts(): Promise<Product[]> {
  const [queryResult, activeCategories] = await Promise.all([
    execDemoQuery(() =>
      demoFilter(
        db().from("products").select(CATALOG_PRODUCT_EMBED as "*").eq("status", LIVE),
        false,
      ).order("created_at", { ascending: false }),
    ),
    loadActiveCategorySlugSet(),
  ]);
  const { data, error } = queryResult;
  if (error) throw error;
  return filterForActiveCategories(
    (data ?? [])
      .map((row) => mapStoreProduct(row as Record<string, unknown>))
      .filter(Boolean) as Product[],
    activeCategories,
  );
}

/** Cached slim catalog for shop grids — safe for ISR (no demo cookie / no fat PDP fields). */
export const fetchCatalogProducts = unstable_cache(
  loadCatalogProducts,
  ["catalog-products-slim"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG] },
);

const SHOP_HUB_PER_CATEGORY_DEFAULT = 16;

/** Bounded per-category queries for `/products` hub — avoids loading the full catalog on ISR. */
async function loadCatalogProductsShopOverview(perCategory: number): Promise<Product[]> {
  const cap = Math.max(4, Math.min(perCategory, 32));
  const [types, activeCategories] = await Promise.all([
    fetchShopTypes(),
    loadActiveCategorySlugSet(),
  ]);
  const slugs = (types.length ? types : FALLBACK_SHOP_TYPES)
    .map((t) => t.slug.trim())
    .filter(Boolean)
    .filter((slug) => !activeCategories || activeCategories.has(slug));
  if (!slugs.length) return [];

  const chunks = await Promise.all(
    slugs.map(async (cat) => {
      const { data, error } = await execDemoQuery(() =>
        demoFilter(
          db()
            .from("products")
            .select(CATALOG_PRODUCT_EMBED as "*")
            .eq("status", LIVE)
            .eq("category", cat)
            .order("featured", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(cap),
          false,
        ),
      );
      if (error) throw error;
      return (data ?? [])
        .map((row) => mapStoreProduct(row as Record<string, unknown>))
        .filter(Boolean) as Product[];
    }),
  );
  return chunks.flat();
}

export function fetchCatalogProductsShopOverview(
  perCategory = SHOP_HUB_PER_CATEGORY_DEFAULT,
): Promise<Product[]> {
  const cap = Math.max(4, Math.min(perCategory, 32));
  return unstable_cache(
    () => loadCatalogProductsShopOverview(cap),
    ["fetchCatalogProductsShopOverview-v2", String(cap)],
    { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG] },
  )();
}

const HOMEPAGE_PRODUCT_LIMIT = 36;

/** Slim catalog for the homepage — avoids a second full-catalog + analytics pass. */
export const fetchHomepageProducts = unstable_cache(
  async (includeDemo = false): Promise<Product[]> => {
    const { data, error } = await execDemoQuery(() =>
      demoFilter(
        db()
          .from("products")
          .select((includeDemo ? PRODUCT_EMBED : CATALOG_PRODUCT_EMBED) as "*")
          .eq("status", LIVE),
        includeDemo
      )
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(HOMEPAGE_PRODUCT_LIMIT)
    );
    if (error) throw error;
    return filterForActiveCategories(
      (data ?? [])
        .map((row) =>
          mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }),
        )
        .filter(Boolean) as Product[],
      await loadActiveCategorySlugSet(),
    );
  },
  ["fetchHomepageProducts"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_HOMEPAGE_CATALOG_CACHE_TAG] },
);

export async function fetchProductBySlug(slug: string, includeDemo = false): Promise<Product | null> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("products").select(PRODUCT_EMBED).eq("slug", slug).eq("status", LIVE),
      includeDemo
    ).maybeSingle()
  );
  if (error) throw error;
  if (!data) return null;
  const product = mapStoreProduct(data as Record<string, unknown>, {
    includeDemoReviews: includeDemo,
  });
  if (!product) return null;
  const active = await loadActiveCategorySlugSet();
  if (active && !active.has(product.category)) return null;
  return product;
}

async function loadPdpProductRow(slug: string): Promise<Product | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(PDP_SHELL_EMBED)
        .eq("slug", trimmed)
        .eq("status", LIVE),
      false,
    ).maybeSingle(),
  );
  if (error) throw error;
  if (!data) return null;
  const product = mapStoreProduct(data as Record<string, unknown>, {
    includeDemoReviews: false,
  });
  if (!product) return null;
  const active = await loadActiveCategorySlugSet();
  if (active && !active.has(product.category)) return null;
  return product;
}

async function loadPdpProductDetailsRow(
  slug: string,
): Promise<ReturnType<typeof mapPdpDetailFields>> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(PDP_DETAILS_EMBED)
        .eq("slug", trimmed)
        .eq("status", LIVE),
      false,
    ).maybeSingle(),
  );
  if (error) throw error;
  return mapPdpDetailFields(data as Record<string, unknown> | null);
}

export async function loadCachedPdpProductBySlug(slug: string): Promise<Product | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  return unstable_cache(
    async () => loadPdpProductRow(trimmed),
    ["pdp-product-v2", trimmed],
    {
      revalidate: STOREFRONT_CATALOG_REVALIDATE,
      tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG, pdpProductCacheTag(trimmed)],
    },
  )();
}

export async function loadCachedPdpDetailsBySlug(
  slug: string,
): Promise<ReturnType<typeof mapPdpDetailFields>> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  return unstable_cache(
    async () => loadPdpProductDetailsRow(trimmed),
    ["pdp-details-v1", trimmed],
    {
      revalidate: STOREFRONT_CATALOG_REVALIDATE,
      tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG, pdpProductCacheTag(trimmed)],
    },
  )();
}

async function loadRelatedCatalogProducts(
  excludeProductId: string,
  category: string,
  limit: number,
): Promise<Product[]> {
  const cat = category.trim();
  if (!cat || !excludeProductId.trim() || limit < 1) return [];
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(CATALOG_PRODUCT_EMBED as "*")
        .eq("status", LIVE)
        .eq("category", cat)
        .neq("id", excludeProductId)
        .order("created_at", { ascending: false })
        .limit(limit),
      false,
    ),
  );
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapStoreProduct(row as Record<string, unknown>))
    .filter(Boolean) as Product[];
}

async function loadCatalogProductsByCategory(category: string): Promise<Product[]> {
  const cat = category.trim();
  if (!cat) return [];
  const [queryResult, activeCategories] = await Promise.all([
    execDemoQuery(() =>
      demoFilter(
        db()
          .from("products")
          .select(CATALOG_PRODUCT_EMBED as "*")
          .eq("status", LIVE)
          .eq("category", cat)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false }),
        false,
      ),
    ),
    loadActiveCategorySlugSet(),
  ]);
  if (activeCategories && !activeCategories.has(cat)) return [];
  const { data, error } = queryResult;
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapStoreProduct(row as Record<string, unknown>))
    .filter(Boolean) as Product[];
}

/** Category PLP — one indexed query instead of full cached catalog + filter. */
export function fetchCatalogProductsByCategory(category: string): Promise<Product[]> {
  const cat = category.trim();
  return unstable_cache(
    async () => loadCatalogProductsByCategory(cat),
    ["fetchCatalogProductsByCategory", cat],
    { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG] },
  )();
}

/** Same-category related cards for PDP — bounded query, catalog embed only. */
export async function fetchRelatedProducts(
  excludeProductId: string,
  category: string,
  limit: number,
): Promise<Product[]> {
  const id = excludeProductId.trim();
  const cat = category.trim();
  const lim = Math.max(1, Math.min(limit, 24));
  return unstable_cache(
    async () => loadRelatedCatalogProducts(id, cat, lim),
    ["fetchRelatedProducts-v2", id, cat, String(lim)],
    { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG] },
  )();
}

/** Slim catalog rows for explicit slugs (e.g. deal pair partners). */
export async function fetchCatalogProductsBySlugs(
  slugs: string[],
): Promise<Product[]> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(CATALOG_PRODUCT_EMBED as "*")
        .eq("status", LIVE)
        .in("slug", unique),
      false,
    ),
  );
  if (error) throw error;
  const bySlug = new Map<string, Product>();
  const active = await loadActiveCategorySlugSet();
  for (const row of data ?? []) {
    const p = mapStoreProduct(row as Record<string, unknown>);
    if (!p) continue;
    if (active && !active.has(p.category)) continue;
    bySlug.set(p.slug, p);
  }
  return unique.map((slug) => bySlug.get(slug)).filter(Boolean) as Product[];
}

export async function fetchProductSlugs(): Promise<{ slug: string }[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("products").select("slug, updated_at").eq("status", LIVE), false)
  );
  if (error) throw error;
  return (data ?? []).map((r) => ({ slug: String(r.slug) }));
}

export async function fetchSitemapProducts(): Promise<{ slug: string; _updatedAt?: string }[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("products").select("slug, updated_at").eq("status", LIVE), false)
  );
  if (error) throw error;
  return (data ?? []).map((r) => ({
    slug: String(r.slug),
    _updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  }));
}

export async function fetchSitemapPages(): Promise<
  { slug: string; pageType?: string; _updatedAt?: string }[]
> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("pages").select("slug, page_type, updated_at").eq("status", LIVE), false)
  );
  if (error) throw error;
  return (data ?? []).map((r) => ({
    slug: String(r.slug),
    pageType: r.page_type ? String(r.page_type) : undefined,
    _updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  }));
}

export async function fetchCatalogFromDb(f: {
  category?: string;
  query?: string;
  sort: string;
  availability: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  includeDemo?: boolean;
}): Promise<{
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const active = await loadActiveCategorySlugSet();
  const page = Math.max(1, f.page);

  if (!categoryIsStorefrontVisible(f.category, active)) {
    return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };
  }

  let query = demoFilter(
    db()
      .from("products")
      .select(CATALOG_PRODUCT_EMBED as "*", { count: "exact" })
      .eq("status", LIVE),
    f.includeDemo,
  );

  if (f.category) {
    query = query.eq("category", f.category);
  } else if (active && active.size > 0) {
    query = query.in("category", [...active]);
  }
  if (f.availability === "in-stock") {
    query = query.neq("stock_status", "out-of-stock");
  }
  if (f.minPrice != null) query = query.gte("price", f.minPrice);
  if (f.maxPrice != null) query = query.lte("price", f.maxPrice);

  const q = f.query ? sanitizeCatalogSearchQuery(f.query) : "";
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,badge.ilike.%${q}%,category.ilike.%${q}%,short_description.ilike.%${q}%`,
    );
  }

  switch (f.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "name-asc":
      query = query.order("name", { ascending: true });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await execDemoQuery(() => query.range(from, to));
  if (error) throw error;

  const total = count ?? data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    return fetchCatalogFromDb({ ...f, page: totalPages });
  }

  const items = (data ?? [])
    .map((row) =>
      mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: f.includeDemo }),
    )
    .filter(Boolean) as Product[];

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
  };
}

async function fetchOrderCountsByProductId(products: Product[]): Promise<Record<string, number>> {
  const slugToId = new Map(products.map((p) => [p.slug, p._id]));
  const { data, error } = await db().from("order_items").select("slug, quantity");
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const slug = String(row.slug ?? "");
    const id = slugToId.get(slug);
    if (!id) continue;
    const qty = Number(row.quantity ?? 0);
    counts[id] = (counts[id] ?? 0) + (Number.isFinite(qty) ? qty : 0);
  }
  return counts;
}

export async function fetchHomeBestsellers(includeDemo = false): Promise<Product[]> {
  const products = await fetchAllProducts(includeDemo);
  const orderCounts = await fetchOrderCountsByProductId(products);
  const viewCounts: Record<string, number> = {};
  const ids = pickBestsellers({
    products: products.map((p) => ({
      id: p._id,
      featured: p.featured,
      stockStatus: p.stockStatus,
    })),
    orderCounts,
    viewCounts,
    limit: 8,
  });
  const byId = new Map(products.map((p) => [p._id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
}

export async function fetchFeaturedByCategory(category: string, limit = 4, includeDemo = false): Promise<Product[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(PRODUCT_EMBED)
        .eq("category", category)
        .eq("featured", true)
        .eq("status", LIVE),
      includeDemo
    )
      .order("created_at", { ascending: false })
      .limit(limit)
  );
  if (error) throw error;
  return filterForActiveCategories(
    (data ?? [])
      .map((row) => mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
      .filter(Boolean) as Product[],
    await loadActiveCategorySlugSet(),
  );
}

function clampStoreLimit(limit: number, max = 8): number {
  if (!Number.isFinite(limit)) return 4;
  return Math.min(Math.max(1, Math.floor(limit)), max);
}

/** Slim storefront cards — category featured (bounded). */
export async function fetchCatalogFeaturedByCategory(
  category: string,
  limit = 4,
  includeDemo = false,
): Promise<Product[]> {
  const cap = clampStoreLimit(limit);
  const cat = category.trim();
  if (!cat) return [];
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(CATALOG_PRODUCT_EMBED as "*")
        .eq("category", cat)
        .eq("featured", true)
        .eq("status", LIVE),
      includeDemo,
    )
      .order("created_at", { ascending: false })
      .limit(cap),
  );
  if (error) throw error;
  const active = await loadActiveCategorySlugSet();
  if (active && !active.has(cat)) return [];
  return filterForActiveCategories(
    (data ?? [])
      .map((row) => mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
      .filter(Boolean) as Product[],
    active,
  );
}

/** Slim storefront cards — site-wide featured (bounded). */
export async function fetchCatalogFeaturedProducts(
  limit = 4,
  includeDemo = false,
): Promise<Product[]> {
  const cap = clampStoreLimit(limit);
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(CATALOG_PRODUCT_EMBED as "*")
        .eq("featured", true)
        .eq("status", LIVE),
      includeDemo,
    )
      .order("created_at", { ascending: false })
      .limit(cap),
  );
  if (error) throw error;
  return filterForActiveCategories(
    (data ?? [])
      .map((row) => mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
      .filter(Boolean) as Product[],
    await loadActiveCategorySlugSet(),
  );
}

/** Slim storefront cards — newest published (bounded). */
export async function fetchCatalogNewestProducts(
  limit = 4,
  includeDemo = false,
): Promise<Product[]> {
  const cap = clampStoreLimit(limit);
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("products")
        .select(CATALOG_PRODUCT_EMBED as "*")
        .eq("status", LIVE),
      includeDemo,
    )
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(cap),
  );
  if (error) throw error;
  return filterForActiveCategories(
    (data ?? [])
      .map((row) => mapStoreProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
      .filter(Boolean) as Product[],
    await loadActiveCategorySlugSet(),
  );
}

export const fetchShopTypes = unstable_cache(
  async (): Promise<ShopType[]> => {
    await ensureFallbackShopTypes();
    let dbTypes: ShopType[] = [];
    const { data, error } = await db()
      .from("categories")
      .select("id, name, slug, description, image_url, sort_order, active")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      dbTypes = data.map((row) => {
        const slug = String(row.slug);
        return {
          id: String(row.id),
          name: String(row.name),
          slug,
          description: String(row.description ?? ""),
          imageUrl: resolveCategoryImagePath(
            row.image_url ? String(row.image_url) : null,
            slug,
          ),
          sortOrder: Number(row.sort_order ?? 0),
        };
      });
    }

    const mergedMap = new Map<string, ShopType>();
    for (const dt of dbTypes) {
      mergedMap.set(dt.slug, dt);
    }

    const { data: publishedCats, error: catErr } = await execDemoQuery(() =>
      demoFilter(
        db().from("products").select("category").eq("status", LIVE),
        false,
      ),
    );
    if (catErr) throw catErr;
    const withLiveProducts = new Set(
      (publishedCats ?? []).map((r) => String(r.category ?? "").trim()).filter(Boolean),
    );

    return Array.from(mergedMap.values())
      .filter((t) => withLiveProducts.has(t.slug))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
  ["shop-types-v3"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_SHOP_TYPES_CACHE_TAG] },
);

export async function fetchCategoryCounts(includeDemo = false): Promise<Record<string, number>> {
  const types = await fetchShopTypes();
  const counts: Record<string, number> = {};
  await Promise.all(
    types.map(async (c) => {
      const { count, error } = await execDemoQuery(() =>
        demoFilter(
          db()
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("category", c.slug)
            .eq("status", LIVE),
          includeDemo
        )
      );
      if (error) throw error;
      counts[c.slug] = count ?? 0;
    })
  );
  return counts;
}

export async function fetchActiveCategories(includeDemo = false): Promise<string[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("products").select("category").eq("status", LIVE), includeDemo)
  );
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => String(r.category)).filter(Boolean))).sort();
}
