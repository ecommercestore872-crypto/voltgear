import { unstable_cache } from "next/cache";

import {
  STOREFRONT_CATALOG_REVALIDATE,
  STOREFRONT_EXTRA_RAILS_CACHE_TAG,
  STOREFRONT_HOME_SLOTS_CACHE_TAG,
} from "@/lib/storefront-cache";

import { revalidateShopMerchandising } from "@/lib/revalidate-storefront";

import {
  extraHomeCollectionRails,
  parseHomeSlot,
  type CollectionAutoRule,
  type CollectionHomeSlot,
  type CollectionMode,
  type CollectionPickerItem,
} from "@/lib/db/collection-rules";
import {
  orderProductsByIds,
  sliceRailProducts,
} from "@/lib/db/home-collection-batch";
import { mapProduct } from "@/lib/db/map";
import { CATALOG_PRODUCT_EMBED } from "@/lib/db/store";
import { getServiceClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { isProductRevision, isRecord, ProductInputError, validateProductCollections } from "@/lib/admin-product-input";
import { validateCollectionInput, confirmedCollection as isConfirmedCollection, type CollectionMutationInput } from "@/lib/collection-input";

function db() {
  return getServiceClient();
}

function adminDb() {
  return getServiceClient({ admin: true });
}

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mode: CollectionMode;
  autoRule: CollectionAutoRule | null;
  homeSlot: CollectionHomeSlot | null;
  sortOrder: number;
  active: boolean;
  productIds: string[];
  revision?: string;
  slotRevisions?: Record<string, string>;
};

function mapCollection(
  row: Record<string, unknown>,
  productIds: string[] = []
): AdminCollection {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: row.description != null ? String(row.description) : null,
    mode: row.mode === "auto" ? "auto" : "manual",
    autoRule:
      row.auto_rule === "featured" || row.auto_rule === "bestsellers"
        ? row.auto_rule
        : null,
    homeSlot: parseHomeSlot(row.home_slot),
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active !== false,
    productIds,
  };
}

// Reads never seed catalog data or claim homepage slots. Explicit atomic commands
// are the only collection mutation surface.

export async function fetchSitemapCollections(): Promise<
  { slug: string; _updatedAt?: string }[]
> {
  const { data, error } = await db().from("collections").select("slug, updated_at, active");
  if (error) throw error;
  return (data ?? [])
    .filter((row) => (row as { active?: boolean }).active !== false)
    .map((row) => ({
      slug: String((row as { slug?: string }).slug ?? ""),
      _updatedAt: (row as { updated_at?: unknown }).updated_at
        ? String((row as { updated_at?: unknown }).updated_at)
        : undefined,
    }))
    .filter((row) => row.slug);
}

/** Product editor — metadata only (no collection_products scan). */
export async function listAdminCollectionPickers(): Promise<CollectionPickerItem[]> {
  const { data, error } = await adminDb()
    .from("collections")
    .select("id, name, slug, mode, auto_rule, home_slot, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    name: String((row as { name?: string }).name ?? ""),
    slug: String((row as { slug?: string }).slug ?? ""),
    mode: (row as { mode?: string }).mode === "auto" ? "auto" : "manual",
    autoRule:
      (row as { auto_rule?: string }).auto_rule === "featured" ||
      (row as { auto_rule?: string }).auto_rule === "bestsellers"
        ? ((row as { auto_rule: "featured" | "bestsellers" }).auto_rule)
        : null,
    homeSlot: parseHomeSlot((row as { home_slot?: unknown }).home_slot),
  }));
}

/** Manual collection memberships for one product (product editor). */
export async function listManualCollectionIdsForProduct(
  productId: string,
): Promise<string[]> {
  const { data: links, error: linkErr } = await adminDb()
    .from("collection_products")
    .select("collection_id")
    .eq("product_id", productId);
  if (linkErr) throw linkErr;
  const ids = [...new Set((links ?? []).map((r) => String((r as { collection_id: string }).collection_id)))];
  if (!ids.length) return [];
  const { data: cols, error: colErr } = await adminDb()
    .from("collections")
    .select("id, mode")
    .in("id", ids);
  if (colErr) throw colErr;
  return (cols ?? [])
    .filter((c) => (c as { mode?: string }).mode === "manual")
    .map((c) => String((c as { id: string }).id));
}

export async function listAdminCollections(): Promise<AdminCollection[]> {
  const { data, error } = await adminDb().rpc("admin_collections_snapshot_v1");
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Safe collection snapshots are unavailable.");
  return data.map(confirmedCollection);
}

export async function getAdminCollection(id: string): Promise<AdminCollection | null> {
  const { data, error } = await adminDb().rpc("admin_collection_snapshot_v1", { p_id: id });
  if (error) throw error;
  if (data === null) return null;
  const collection = confirmedCollection(data);
  if (collection.id !== id) throw new Error("Collection snapshot identity mismatch.");
  return collection;
}

function confirmedCollection(value: unknown): AdminCollection {
  if (!isConfirmedCollection(value) || !isRecord(value) || !isRecord(value.slotRevisions)
      || !Number.isInteger(value.sortOrder) || (value.sortOrder as number) < 0 || (value.sortOrder as number) > 2147483647
      || (value.description !== null && typeof value.description !== "string")
      || !["bestsellers", "featured", "offers"].every((slot) => isProductRevision((value.slotRevisions as Record<string, unknown>)[slot]))) {
    throw new Error("The collection snapshot could not be confirmed.");
  }
  validateProductCollections([value.id]);
  validateProductCollections(value.productIds);
  if (value.homeSlot !== null && !parseHomeSlot(value.homeSlot)) throw new Error("Invalid collection home slot.");
  return value as unknown as AdminCollection;
}

async function writeCollection(action: "create" | "update" | "delete", id: string | null, input: unknown) {
  try { validateCollectionInput(input, action); }
  catch (error) { return { ok: false as const, error: error instanceof ProductInputError ? error.message : "Invalid collection input.", status: 400 }; }
  const command = input as CollectionMutationInput;
  const { expectedRevision, expectedSlotRevision, ...document } = command;
  const { data, error } = await adminDb().rpc("admin_write_collection_v1", {
    p_action: action, p_id: id, p_document: document,
    p_expected_revision: expectedRevision ?? null, p_expected_slot_revision: expectedSlotRevision ?? null,
  });
  if (error) {
    if (["40001", "55P03", "40P01", "23505"].includes(error.code ?? "") || error.message?.startsWith("CONFLICT:")) return { ok: false as const, error: "The collection, membership or home placement changed or is busy. Reload and review before retrying.", status: 409 };
    if (["PGRST202", "42501", "42703", "42883"].includes(error.code ?? "")) return { ok: false as const, error: "Safe collection writes are unavailable. The approved collection migration is required; no legacy write was attempted.", status: 503 };
    if (error.message?.startsWith("BUSINESS_ERROR:")) return { ok: false as const, error: error.message.slice("BUSINESS_ERROR:".length).trim(), status: 400 };
    return { ok: false as const, error: "The collection change could not be confirmed. Reload before retrying.", status: 500 };
  }
  let collection: AdminCollection | undefined;
  try {
    if (!isRecord(data) || data.ok !== true || typeof data.id !== "string" || (id !== null && id !== data.id)
        || !isProductRevision(data.revision) || (data.previousSlug !== null && typeof data.previousSlug !== "string")) throw new Error("Unconfirmed result");
    validateProductCollections([data.id]);
    if (action === "delete") { if (data.deleted !== true) throw new Error("Unconfirmed deletion"); }
    else {
      collection = confirmedCollection(data.collection);
      if (collection.id !== data.id || collection.revision !== data.revision) throw new Error("Snapshot mismatch");
    }
  } catch { return { ok: false as const, error: "The collection write outcome is uncertain. Reload before retrying.", status: 502 }; }
  // The command returns its committed snapshot. No post-write fetch can replace
  // this response with another editor's later changes or turn a commit into a 404.
  const result = data as { id: string; revision: string; previousSlug: string | null };
  void revalidateShopMerchandising("/", "/products", "/admin/home", "/admin/collections", `/admin/collections/${result.id}`,
    ...(result.previousSlug ? [`/collections/${result.previousSlug}`] : []),
    ...(collection ? [`/collections/${collection.slug}`] : []));
  return { ok: true as const, id: result.id, revision: result.revision, collection, deleted: action === "delete" };
}

export async function createAdminCollection(input: unknown) { return writeCollection("create", null, input); }
export async function updateAdminCollection(id: string, input: unknown) { return writeCollection("update", id, input); }
export async function deleteAdminCollection(id: string, expectedRevision?: unknown) { return writeCollection("delete", id, { expectedRevision }); }

/** Resolve product IDs for a collection.
 * - Manual: returns the explicit member list.
 * - Auto: returns pinned products (front) merged with auto-rule products (deduplicated).
 */
export async function resolveCollectionProductIds(
  collection: AdminCollection
): Promise<string[]> {
  if (collection.mode === "manual") return collection.productIds;

  // --- Auto collection: pinned overrides come first ---
  const pinnedIds = collection.productIds; // already loaded from collection_products

  let autoIds: string[] = [];
  if (collection.autoRule === "featured") {
    const { data, error } = await db()
      .from("products")
      .select("id")
      .eq("featured", true)
      .eq("status", "published")
      .limit(24);
    if (error) throw error;
    autoIds = (data ?? []).map((r) => String((r as { id: string }).id));
  } else {
    // bestsellers: featured first, then recent published
    const { data: featured } = await db()
      .from("products")
      .select("id")
      .eq("featured", true)
      .eq("status", "published")
      .limit(8);
    const ids = (featured ?? []).map((r) => String((r as { id: string }).id));
    if (ids.length < 8) {
      const { data: rest } = await db()
        .from("products")
        .select("id")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(16);
      for (const r of rest ?? []) {
        const id = String((r as { id: string }).id);
        if (!ids.includes(id)) ids.push(id);
        if (ids.length >= 8) break;
      }
    }
    autoIds = ids;
  }

  // Merge: pinned first, then auto (skip duplicates)
  const merged: string[] = [...pinnedIds];
  for (const id of autoIds) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

const HOME_SLOTS: CollectionHomeSlot[] = ["bestsellers", "featured", "offers"];

function mapRowsToProductsById(
  rows: unknown[],
  includeDemo: boolean,
): Map<string, Product> {
  const byId = new Map<string, Product>();
  for (const row of rows) {
    const p = mapProduct(row as Record<string, unknown>, {
      includeDemoReviews: includeDemo,
      storefront: true,
    });
    if (!p) continue;
    if (!includeDemo && p.isDemo) continue;
    byId.set(String((row as { id: string }).id), p);
  }
  return byId;
}

async function storefrontProductsForIds(
  ids: string[],
  includeDemo = false,
): Promise<Product[]> {
  if (!ids.length) return [];
  const select = (includeDemo ? PRODUCT_EMBED : CATALOG_PRODUCT_EMBED) as "*";
  const { data: rows, error: pErr } = await db()
    .from("products")
    .select(select)
    .in("id", ids)
    .eq("status", "published");
  if (pErr) throw pErr;
  const byId = mapRowsToProductsById(rows ?? [], includeDemo);
  return orderProductsByIds(ids, byId);
}

async function loadHomeSlotCollections(): Promise<
  Map<CollectionHomeSlot, AdminCollection>
> {
  const { data, error } = await db()
    .from("collections")
    .select("*")
    .in("home_slot", HOME_SLOTS)
    .eq("active", true);
  if (error) throw error;

  const rows = data ?? [];
  const ids = rows.map((r) => String((r as { id: string }).id));
  const productMap = new Map<string, string[]>();
  if (ids.length) {
    const { data: links, error: lErr } = await db()
      .from("collection_products")
      .select("collection_id, product_id, sort_order")
      .in("collection_id", ids)
      .order("sort_order", { ascending: true });
    if (lErr) throw lErr;
    for (const link of links ?? []) {
      const cid = String((link as { collection_id: string }).collection_id);
      const pid = String((link as { product_id: string }).product_id);
      const list = productMap.get(cid) ?? [];
      list.push(pid);
      productMap.set(cid, list);
    }
  }

  const bySlot = new Map<CollectionHomeSlot, AdminCollection>();
  for (const row of rows) {
    const col = mapCollection(
      row as Record<string, unknown>,
      productMap.get(String((row as { id: string }).id)) ?? [],
    );
    if (col.homeSlot) bySlot.set(col.homeSlot, col);
  }
  return bySlot;
}

const loadHomeSlotProductsBundle = unstable_cache(
  async (
    includeDemo = false,
  ): Promise<Record<CollectionHomeSlot, Product[] | null>> => {
    const bySlot = await loadHomeSlotCollections();
    const idLists = new Map<CollectionHomeSlot, string[]>();
    await Promise.all(
      HOME_SLOTS.map(async (slot) => {
        const col = bySlot.get(slot);
        if (!col) {
          idLists.set(slot, []);
          return;
        }
        idLists.set(slot, await resolveCollectionProductIds(col));
      }),
    );

    const allIds = [
      ...new Set(HOME_SLOTS.flatMap((slot) => idLists.get(slot) ?? [])),
    ];
    const products = await storefrontProductsForIds(allIds, includeDemo);
    const byId = new Map(products.map((p) => [p._id, p]));

    const result: Record<CollectionHomeSlot, Product[] | null> = {
      bestsellers: null,
      featured: null,
      offers: null,
    };
    for (const slot of HOME_SLOTS) {
      if (!bySlot.has(slot)) {
        result[slot] = null;
        continue;
      }
      const ids = idLists.get(slot) ?? [];
      result[slot] = orderProductsByIds(ids, byId);
    }
    return result;
  },
  ["fetchProductsForHomeSlots"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_HOME_SLOTS_CACHE_TAG] },
);

/** All reserved home-slot rails in one cached bundle (one product IN query). */
export async function fetchProductsForHomeSlots(includeDemo = false) {
  return loadHomeSlotProductsBundle(includeDemo);
}

/** Products for a home rail when an active collection claims that slot. */
export async function fetchProductsForHomeSlot(
  slot: CollectionHomeSlot,
  includeDemo = false,
): Promise<Product[] | null> {
  const bundle = await loadHomeSlotProductsBundle(includeDemo);
  return bundle[slot] ?? null;
}

async function productsForIds(
  ids: string[],
  includeDemo = false
): Promise<Product[]> {
  if (!ids.length) return [];
  const { data: rows, error: pErr } = await db()
    .from("products")
    .select(PRODUCT_EMBED)
    .in("id", ids)
    .eq("status", "published");
  if (pErr) throw pErr;

  const byId = mapRowsToProductsById(rows ?? [], includeDemo);
  return orderProductsByIds(ids, byId);
}

export type StorefrontCollectionRail = {
  id: string;
  name: string;
  slug: string;
  products: Product[];
};

/** Active collections that are not bound to a reserved home slot. */
export const fetchExtraCollectionRails = unstable_cache(
  async (includeDemo = false): Promise<StorefrontCollectionRail[]> => {
    const collections = await listAdminCollections();
    const extras = extraHomeCollectionRails(collections);
    if (!extras.length) return [];

    const idLists = await Promise.all(
      extras.map(async (collection) => ({
        collection,
        ids: await resolveCollectionProductIds(collection),
      })),
    );

    const allIds = [...new Set(idLists.flatMap((entry) => entry.ids))];
    const products = await storefrontProductsForIds(allIds, includeDemo);
    const byId = new Map(products.map((p) => [p._id, p]));

    const rails: StorefrontCollectionRail[] = [];
    for (const { collection, ids } of idLists) {
      const ordered = sliceRailProducts(orderProductsByIds(ids, byId));
      if (!ordered.length) continue;
      rails.push({
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        products: ordered,
      });
    }
    return rails;
  },
  ["fetchExtraCollectionRails"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE, tags: [STOREFRONT_EXTRA_RAILS_CACHE_TAG] },
);

export async function getStorefrontCollectionBySlug(
  slug: string,
  includeDemo = false
): Promise<{ collection: AdminCollection; products: Product[] } | null> {
  const { data, error } = await db()
    .from("collections")
    .select("id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  const collection = await getAdminCollection(String((data as { id: string }).id));
  if (!collection) return null;
  const ids = await resolveCollectionProductIds(collection);
  const products = await productsForIds(ids, includeDemo);
  return { collection, products };
}
