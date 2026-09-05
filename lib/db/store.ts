import { unstable_cache } from "next/cache";

import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import { ensureFallbackShopTypes, ensureShopperBrandSettings } from "@/lib/db/admin-store";
import {
  mapHero,
  mapHeroSlide,
  mapPage,
  mapProduct,
  mapSettings,
  mapTestimonial,
} from "@/lib/db/map";
import { pickBestsellers } from "@/lib/db/bestsellers-rules";
import { MAX_HERO_SLIDES } from "@/lib/db/hero-slide-rules";
import { formatOrderId, nextSequentialNumber } from "@/lib/db/order-id";
import { getServiceClient } from "@/lib/supabase/server";
import type { OrderAttributionSnapshot } from "@/lib/db/analytics-checkout-rules";
import type {
  EmailEventKind,
  HeroSection,
  HeroSlide,
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
  Page,
  Product,
  ProductReview,
  SiteSettings,
  Testimonial,
} from "@/lib/types";

const PAGE_SIZE = 12;
const LIVE = "published";

let demoColumnMissing = false;

function isMissingIsDemoColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  return Boolean(
    error && error.code === "42703" && (error.message ?? "").includes("is_demo")
  );
}

function demoFilter<T extends { or: (filters: string) => T }>(
  query: T,
  includeDemo?: boolean
): T {
  if (demoColumnMissing || includeDemo) return query;
  return query.or("is_demo.eq.false,is_demo.is.null");
}

async function execDemoQuery<T extends { error: { code?: string; message?: string } | null }>(
  run: () => PromiseLike<T>
): Promise<T> {
  const first = await run();
  if (!isMissingIsDemoColumn(first.error)) return first;
  demoColumnMissing = true;
  return run();
}

const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

function db() {
  return getServiceClient();
}

export async function allocatePublicOrderId(): Promise<string> {
  const { data, error } = await db().rpc("next_order_public_number");
  if (!error && data != null) {
    const n = Number(data);
    if (Number.isInteger(n) && n >= 1) return formatOrderId(n);
  }
  const { data: rows } = await db().from("orders").select("order_id");
  const ids = (rows ?? []).map((row) => String(row.order_id ?? ""));
  return formatOrderId(nextSequentialNumber(ids));
}

export async function fetchAllProducts(includeDemo = false): Promise<Product[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("products").select(PRODUCT_EMBED).eq("status", LIVE),
      includeDemo
    ).order("created_at", { ascending: false })
  );
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
    .filter(Boolean) as Product[];
}

export async function fetchProductBySlug(slug: string, includeDemo = false): Promise<Product | null> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("products").select(PRODUCT_EMBED).eq("slug", slug).eq("status", LIVE),
      includeDemo
    ).maybeSingle()
  );
  if (error) throw error;
  return mapProduct(data as Record<string, unknown> | null, { includeDemoReviews: includeDemo });
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
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("products").select(PRODUCT_EMBED).eq("status", LIVE),
      f.includeDemo
    ).order("created_at", { ascending: false })
  );
  if (error) throw error;
  let items = (data ?? [])
    .map((row) => mapProduct(row as Record<string, unknown>, { includeDemoReviews: f.includeDemo }))
    .filter(Boolean) as Product[];

  if (f.category) items = items.filter((p) => p.category === f.category);
  if (f.availability === "in-stock") items = items.filter((p) => p.stockStatus !== "out-of-stock");
  if (f.minPrice != null) items = items.filter((p) => p.price >= f.minPrice!);
  if (f.maxPrice != null) items = items.filter((p) => p.price <= f.maxPrice!);
  if (f.query) {
    const q = f.query.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.badge ?? "").toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => {
    switch (f.sort) {
      case "newest":
        return 0;
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name-asc":
        return a.name.localeCompare(b.name);
      default:
        return Number(b.featured) - Number(a.featured);
    }
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, totalPages);
  const from = (page - 1) * PAGE_SIZE;
  return {
    items: items.slice(from, from + PAGE_SIZE),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
  };
}

export const fetchShopTypes = unstable_cache(
  async (): Promise<ShopType[]> => {
    await ensureFallbackShopTypes();
    let dbTypes: ShopType[] = [];
    const { data, error } = await db()
      .from("categories")
      .select("id, name, slug, description, image_url, sort_order")
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      dbTypes = data.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        description: String(row.description ?? ""),
        imageUrl: row.image_url ? String(row.image_url) : undefined,
        sortOrder: Number(row.sort_order ?? 0),
      }));
    }

    // Also fetch distinct product categories from the published products table
    const { data: prodData } = await db()
      .from("products")
      .select("category")
      .eq("status", LIVE);

    const productCategories = Array.from(
      new Set((prodData ?? []).map((p) => String(p.category || "").trim()))
    ).filter(Boolean);

    // Merge database categories and product categories dynamically
    const mergedMap = new Map<string, ShopType>();

    // 1. Give DB definitions absolute priority
    for (const dt of dbTypes) {
      mergedMap.set(dt.slug, dt);
    }

    return Array.from(mergedMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  ["shop-types-v2"],
  { revalidate: 60 }
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

export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  await ensureShopperBrandSettings();
  const { data, error } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return mapSettings(data as Record<string, unknown> | null);
}

export async function fetchHero(includeDemo = false): Promise<HeroSection | null> {
  const { data, error } = await db().from("hero_sections").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.status && data.status !== LIVE) return null;
  let featured: Product | null = null;
  if (data.featured_product_id) {
    const { data: prod } = await execDemoQuery(() =>
      demoFilter(
        db()
          .from("products")
          .select(PRODUCT_EMBED)
          .eq("id", data.featured_product_id)
          .eq("status", LIVE),
        includeDemo
      ).maybeSingle()
    );
    featured = mapProduct(prod as Record<string, unknown> | null, {
      includeDemoReviews: includeDemo,
    });
  }
  return mapHero(data as Record<string, unknown>, featured);
}

export async function fetchHeroSlides(includeDemo = false): Promise<HeroSlide[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("hero_slides").select("*").eq("status", LIVE), includeDemo)
      .order("sort_order", { ascending: true })
      .limit(MAX_HERO_SLIDES)
  );
  if (error) {
    // Table may not exist until migration is pushed
    if (error.code === "42P01" || /hero_slides/i.test(error.message ?? "")) return [];
    throw error;
  }
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const productIds = Array.from(
    new Set(rows.map((r) => String(r.product_id)).filter(Boolean))
  );
  const { data: products, error: productError } = await execDemoQuery(() =>
    demoFilter(
      db().from("products").select(PRODUCT_EMBED).in("id", productIds).eq("status", LIVE),
      includeDemo
    )
  );
  if (productError) throw productError;

  const byId = new Map<string, Product>();
  for (const row of products ?? []) {
    const mapped = mapProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo });
    if (mapped) byId.set(mapped._id, mapped);
  }

  const slides: HeroSlide[] = [];
  for (const row of rows) {
    const product = byId.get(String(row.product_id));
    if (!product || !String(row.image_url ?? "").trim()) continue;
    slides.push(mapHeroSlide(row as Record<string, unknown>, product));
  }
  return slides.slice(0, MAX_HERO_SLIDES);
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

async function fetchViewCountsByProductId(): Promise<Record<string, number>> {
  const { data, error } = await db()
    .from("analytics_events")
    .select("product_id")
    .eq("name", "product_view")
    .not("product_id", "is", null);
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = String(row.product_id ?? "");
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchHomeBestsellers(includeDemo = false): Promise<Product[]> {
  const products = await fetchAllProducts(includeDemo);
  const [orderCounts, viewCounts] = await Promise.all([
    fetchOrderCountsByProductId(products),
    fetchViewCountsByProductId(),
  ]);
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

export async function fetchTestimonials(includeDemo = false): Promise<Testimonial[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("testimonials").select("*").eq("status", LIVE), includeDemo)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
  );
  if (error) throw error;
  return (data ?? []).map((row) => mapTestimonial(row as Record<string, unknown>));
}

export async function fetchBlogPosts(includeDemo = false): Promise<Page[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("pages").select("*").eq("page_type", "blog").eq("status", LIVE),
      includeDemo
    ).order("published_at", { ascending: false, nullsFirst: false })
  );
  if (error) throw error;
  return (data ?? []).map((row) => mapPage(row as Record<string, unknown>)).filter(Boolean) as Page[];
}

export async function fetchPageBySlug(slug: string, includeDemo = false): Promise<Page | null> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("pages").select("*").eq("slug", slug).eq("status", LIVE), includeDemo).maybeSingle()
  );
  if (error) throw error;
  return mapPage(data as Record<string, unknown> | null);
}

export async function fetchPageSlugs(): Promise<{ slug: string }[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("pages").select("slug").eq("status", LIVE), false)
  );
  if (error) throw error;
  return (data ?? []).map((r) => ({ slug: String(r.slug) }));
}

export async function fetchReviewProducts(includeDemo = false): Promise<
  { _id: string; slug: string; name: string; category: string; image?: string | null }[]
> {
  const products = await fetchAllProducts(includeDemo);
  return products
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      _id: p._id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      image: typeof p.images?.[0] === "string" ? p.images[0] : null,
    }));
}

export async function fetchApprovedReviews(
  productId: string,
  includeDemo = false
): Promise<ProductReview[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("review_submissions")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved"),
      includeDemo
    ).order("created_at", { ascending: false })
  );
  if (error) throw error;
  return (data ?? []).map((r) => ({
    name: r.name ? String(r.name) : undefined,
    rating: r.rating != null ? Number(r.rating) : undefined,
    date: r.created_at ? String(r.created_at) : undefined,
    comment: r.comment ? String(r.comment) : undefined,
    verified: Boolean(r.verified),
    image: r.image ? String(r.image) : undefined,
    isDemo: Boolean(r.is_demo),
  }));
}

function mapOrder(row: Record<string, unknown>, items: OrderItem[], history: Order["statusHistory"]): Order {
  return {
    _id: String(row.id),
    orderId: String(row.order_id),
    customer: (row.customer as OrderCustomer) ?? {},
    items,
    payment: row.payment ? String(row.payment) : "cod",
    subtotal: Number(row.subtotal ?? 0),
    shipping: Number(row.shipping ?? 0),
    total: Number(row.total ?? 0),
    status: (row.status as OrderStatus) ?? "new",
    statusUpdatedAt: row.status_updated_at ? String(row.status_updated_at) : undefined,
    statusHistory: history,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    isDemo: Boolean(row.is_demo),
    postexTrackingNumber: row.postex_tracking_number
      ? String(row.postex_tracking_number)
      : undefined,
  };
}

async function loadOrderBundle(row: Record<string, unknown>): Promise<Order> {
  const id = String(row.id);
  const [{ data: items }, { data: history }] = await Promise.all([
    db().from("order_items").select("*").eq("order_id", id),
    db().from("order_status_history").select("*").eq("order_id", id).order("at", { ascending: true }),
  ]);
  return mapOrder(
    row,
    (items ?? []).map((i) => ({
      slug: i.slug ? String(i.slug) : undefined,
      name: i.name ? String(i.name) : undefined,
      price: i.price != null ? Number(i.price) : undefined,
      quantity: i.quantity != null ? Number(i.quantity) : undefined,
      variantKey: i.variant_key ? String(i.variant_key) : undefined,
      variantName: i.variant_name ? String(i.variant_name) : undefined,
      variantSku: i.variant_sku ? String(i.variant_sku) : undefined,
      lineTotal: i.line_total != null ? Number(i.line_total) : undefined,
    })),
    (history ?? []).map((h) => ({
      status: h.status as OrderStatus,
      note: h.note ? String(h.note) : undefined,
      at: h.at ? String(h.at) : undefined,
    }))
  );
}

export async function createOrderRow(input: {
  orderId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount?: number;
  promoCode?: string | null;
  isDemo?: boolean;
}): Promise<string | null> {
  const row: Record<string, unknown> = {
    order_id: input.orderId,
    customer: input.customer,
    payment: input.payment,
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    status: "new",
    is_demo: Boolean(input.isDemo),
  };
  if (input.discount != null && input.discount > 0) {
    row.discount = input.discount;
  }
  if (input.promoCode) {
    row.promo_code = input.promoCode;
  }
  const rpcItems = input.items.map((i) => ({
    slug: i.slug,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    variantKey: i.variantKey,
    variantName: i.variantName,
    variantSku: i.variantSku,
    lineTotal: i.lineTotal,
  }));

  const { data: rpcData, error: rpcError } = await db().rpc("checkout_place_order", {
    p_order_id: input.orderId,
    p_customer: input.customer,
    p_payment: input.payment,
    p_subtotal: input.subtotal,
    p_shipping: input.shipping,
    p_total: input.total,
    p_discount: input.discount ?? 0,
    p_promo_code: input.promoCode ?? "",
    p_is_demo: Boolean(input.isDemo),
    p_items: rpcItems,
  });

  if (!rpcError && rpcData?.ok) {
    return input.orderId;
  }

  if (rpcError?.message?.includes("BUSINESS_ERROR:")) {
    throw new Error(
      `ATOMIC_BUSINESS_ERROR:${rpcError.message.split("BUSINESS_ERROR:")[1].trim()}`
    );
  }

  const rpcMissing =
    !rpcError ||
    rpcError.code === "PGRST202" ||
    rpcError.code === "42883" ||
    rpcError.message?.includes("could not find");

  if (rpcError && !rpcMissing) {
    console.error("[order] checkout_place_order failed:", rpcError);
    throw new Error("ATOMIC_INFRA_ERROR");
  }

  let { data, error } = await db().from("orders").insert(row).select("id").single();
  if (isMissingIsDemoColumn(error)) {
    demoColumnMissing = true;
    const rest = { ...row };
    delete (rest as { is_demo?: boolean }).is_demo;
    ({ data, error } = await db().from("orders").insert(rest).select("id").single());
  }
  if (error) {
    if (error.code === "23505") return null;
    console.error("[order] create failed:", error);
    return null;
  }
  if (!data) return null;
  if (input.items.length) {
    const { error: itemErr } = await db().from("order_items").insert(
      input.items.map((i) => ({
        order_id: data.id,
        slug: i.slug,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        variant_key: i.variantKey,
        variant_name: i.variantName,
        variant_sku: i.variantSku,
        line_total: i.lineTotal,
      }))
    );
    if (itemErr) {
      console.error("[order] items failed:", itemErr);
      return null;
    }
  }
  return input.orderId;
}

export async function cancelOrderRestoreInventoryRow(orderId: string, note: string): Promise<{ ok: boolean, error?: string }> {
  const { data, error } = await db().rpc("cancel_order_restore_inventory", {
    p_order_id: orderId,
    p_note: note
  });

  if (!error && data?.ok) {
    return { ok: true };
  }

  if (error && (error.code === 'PGRST202' || error.message?.includes('could not find') || error.code === '42883')) {
    console.warn("[order] Atomic cancellation RPC unavailable, falling back to legacy status update");
    const updated = await updateOrderStatusRow(orderId, 'cancelled', note);
    if (!updated) return { ok: false, error: "Failed to update status" };
    return { ok: true };
  }

  if (error?.message?.includes('BUSINESS_ERROR:')) {
    return { ok: false, error: error.message.split('BUSINESS_ERROR:')[1].trim() };
  }

  console.error("[order] atomic cancellation infra failed:", error);
  return { ok: false, error: 'Cancellation failed due to a system error.' };
}

export async function updateOrderAttributionRow(
  orderId: string,
  attrib: OrderAttributionSnapshot
): Promise<void> {
  try {
    const { error } = await db()
      .from("orders")
      .update({
        analytics_session_id: attrib.analytics_session_id,
        analytics_visitor_id: attrib.analytics_visitor_id,
        attrib_source: attrib.attrib_source,
        attrib_medium: attrib.attrib_medium,
        attrib_campaign: attrib.attrib_campaign,
        attrib_campaign_id: attrib.attrib_campaign_id,
        attrib_ttclid: attrib.attrib_ttclid,
        attrib_fbclid: attrib.attrib_fbclid,
        attrib_gclid: attrib.attrib_gclid,
      })
      .eq("order_id", orderId);
    if (error) {
      console.error("[analytics-checkout]", "update failed");
    }
  } catch {
    console.error("[analytics-checkout]", "update failed");
  }
}

export async function getOrderByPublicId(orderId: string): Promise<Order | null> {
  const { data, error } = await db().from("orders").select("*").eq("order_id", orderId).maybeSingle();
  if (error || !data) return null;
  return loadOrderBundle(data as Record<string, unknown>);
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .eq("customer->>email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all((data ?? []).map((row) => loadOrderBundle(row as Record<string, unknown>)));
}

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all((data ?? []).map((row) => loadOrderBundle(row as Record<string, unknown>)));
}

export async function appendOrderHistoryNote(
  orderId: string,
  note: string
): Promise<void> {
  const current = await getOrderByPublicId(orderId);
  if (!current || !note.trim()) return;
  const { error } = await db().from("order_status_history").insert({
    order_id: current._id,
    status: current.status ?? "new",
    note: note.trim(),
    at: new Date().toISOString(),
  });
  if (error) {
    console.error("[orders] email note failed:", error);
  }
}

export async function updateOrderStatusRow(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<Order | null> {
  const current = await getOrderByPublicId(orderId);
  if (!current) return null;
  const now = new Date().toISOString();
  const { error } = await db()
    .from("orders")
    .update({ status, status_updated_at: now })
    .eq("order_id", orderId);
  if (error) {
    console.error("[orders] status update failed:", error);
    return null;
  }
  await db().from("order_status_history").insert({
    order_id: current._id,
    status,
    note: note || null,
    at: now,
  });
  return getOrderByPublicId(orderId);
}

export async function deleteOrderRow(orderId: string): Promise<boolean> {
  const current = await getOrderByPublicId(orderId);
  if (!current) return false;

  // Manual cleanup to ensure no orphaned rows regardless of FK constraint policies
  await db().from("order_status_history").delete().eq("order_id", current._id);
  await db().from("order_items").delete().eq("order_id", current._id);
  
  const { error } = await db().from("orders").delete().eq("id", current._id);
  if (error) {
    console.error("[orders] delete failed:", error);
    return false;
  }
  return true;
}

export async function enqueueEmailEventRow(
  kind: EmailEventKind,
  email: string,
  data: unknown,
  delayMs: number
): Promise<void> {
  const dueAt = new Date(Date.now() + delayMs).toISOString();
  const { error } = await db().from("email_events").insert({
    kind,
    email,
    data,
    due_at: dueAt,
  });
  if (error) console.error("[flows] enqueue failed:", error);
}

export async function getPendingEmailEvents(): Promise<
  { _id: string; kind: EmailEventKind; email: string; data?: string; dueAt?: string }[]
> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("email_events")
    .select("*")
    .is("sent_at", null)
    .lte("due_at", now)
    .order("due_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((e) => ({
    _id: String(e.id),
    kind: e.kind as EmailEventKind,
    email: String(e.email),
    data: e.data != null ? JSON.stringify(e.data) : undefined,
    dueAt: e.due_at ? String(e.due_at) : undefined,
  }));
}

export async function markEmailSent(eventId: string, sentAt = new Date().toISOString()): Promise<void> {
  const { error } = await db().from("email_events").update({ sent_at: sentAt }).eq("id", eventId);
  if (error) console.error("[flows] mark sent failed:", error);
}

export async function recentWinbackExists(email: string, sinceIso: string): Promise<boolean> {
  const { data, error } = await db()
    .from("email_events")
    .select("id")
    .eq("kind", "win-back")
    .eq("email", email)
    .gt("created_at", sinceIso)
    .limit(1);
  if (error) return false;
  return Boolean(data?.length);
}

export async function submitReview(input: {
  slug: string;
  rating: number;
  name: string;
  email: string;
  comment: string;
  image?: string;
  category?: string;
  productName?: string;
  verified: boolean;
  isDemo?: boolean;
}): Promise<{ ok: true; duplicate?: boolean; verified?: boolean } | { ok: false; error: string; status: number }> {
  const product = await fetchProductBySlug(input.slug, Boolean(input.isDemo));
  if (!product) return { ok: false, error: "Product not found.", status: 404 };

  const { data: existing } = await db()
    .from("review_submissions")
    .select("id")
    .eq("email", input.email)
    .eq("product_id", product._id)
    .eq("status", "pending")
    .limit(1);
  if (existing?.length) return { ok: true, duplicate: true };

  const row: Record<string, unknown> = {
    product_id: product._id,
    name: input.name,
    email: input.email,
    rating: input.rating,
    comment: input.comment,
    image: input.image || null,
    category: input.category || null,
    product_name: input.productName || null,
    verified: input.verified,
    status: "pending",
    is_demo: Boolean(input.isDemo),
  };
  let { error } = await db().from("review_submissions").insert(row);
  if (isMissingIsDemoColumn(error)) {
    demoColumnMissing = true;
    const rest = { ...row };
    delete (rest as { is_demo?: boolean }).is_demo;
    ({ error } = await db().from("review_submissions").insert(rest));
  }
  if (error) return { ok: false, error: "Something went wrong submitting your review.", status: 500 };
  return { ok: true, verified: input.verified };
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
  return (data ?? [])
    .map((row) => mapProduct(row as Record<string, unknown>, { includeDemoReviews: includeDemo }))
    .filter(Boolean) as Product[];
}
