import { revalidatePath } from "next/cache";

import {
  canAssignProductToCollection,
  canSaveCollection,
  extraHomeCollectionRails,
  inferHomeSlotFromName,
  parseCollectionIds,
  parseHomeSlot,
  slugifyCollectionName,
  type CollectionAutoRule,
  type CollectionHomeSlot,
  type CollectionMode,
} from "@/lib/db/collection-rules";
import { getServiceClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/db/map";
import type { Product } from "@/lib/types";

function db() {
  return getServiceClient();
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

export async function listAdminCollections(): Promise<AdminCollection[]> {
  const { data, error } = await db()
    .from("collections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;

  const ids = (data ?? []).map((r) => String((r as { id: string }).id));
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

  return (data ?? []).map((row) =>
    mapCollection(row as Record<string, unknown>, productMap.get(String((row as { id: string }).id)) ?? [])
  );
}

export async function getAdminCollection(id: string): Promise<AdminCollection | null> {
  const { data, error } = await db()
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: links, error: lErr } = await db()
    .from("collection_products")
    .select("product_id, sort_order")
    .eq("collection_id", id)
    .order("sort_order", { ascending: true });
  if (lErr) throw lErr;
  const productIds = (links ?? []).map((l) =>
    String((l as { product_id: string }).product_id)
  );
  return mapCollection(data as Record<string, unknown>, productIds);
}

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  let q = db().from("collections").select("id").eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function createAdminCollection(input: {
  name?: string;
  slug?: string;
  description?: string;
  mode?: string;
  autoRule?: string | null;
  homeSlot?: string | null;
  active?: boolean;
  productIds?: string[];
}) {
  const mode = input.mode === "auto" ? "auto" : "manual";
  const autoRule =
    mode === "auto" &&
    (input.autoRule === "featured" || input.autoRule === "bestsellers")
      ? input.autoRule
      : null;
  const homeSlot =
    input.homeSlot === undefined
      ? inferHomeSlotFromName(String(input.name ?? ""))
      : parseHomeSlot(input.homeSlot);
  const check = canSaveCollection({
    name: input.name,
    slug: input.slug,
    mode,
    autoRule,
  });
  if (!check.ok) return { ok: false as const, error: check.error, status: 400 };

  const slug =
    input.slug?.trim() || slugifyCollectionName(String(input.name));
  if (await slugTaken(slug)) {
    return { ok: false as const, error: "That slug is already used.", status: 409 };
  }

  if (homeSlot) await clearHomeSlot(homeSlot);

  const { data, error } = await db()
    .from("collections")
    .insert({
      name: String(input.name).trim(),
      slug,
      description: input.description?.trim() || null,
      mode,
      auto_rule: autoRule,
      home_slot: homeSlot,
      active: input.active !== false,
      sort_order: 0,
    })
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message, status: 500 };

  const id = String(data.id);
  if (mode === "manual" && input.productIds?.length) {
    await replaceCollectionProducts(id, input.productIds);
  }
  revalidatePath("/admin/collections");
  revalidatePath("/");
  revalidatePath("/admin/home");
  revalidatePath(`/collections/${slug}`);
  return { ok: true as const, collection: await getAdminCollection(id) };
}

export async function updateAdminCollection(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    mode?: string;
    autoRule?: string | null;
    homeSlot?: string | null;
    active?: boolean;
    productIds?: string[];
  }
) {
  const existing = await getAdminCollection(id);
  if (!existing) return { ok: false as const, error: "Not found.", status: 404 };

  const mode = input.mode === "auto" ? "auto" : input.mode === "manual" ? "manual" : existing.mode;
  const autoRule =
    mode === "auto"
      ? input.autoRule === "featured" || input.autoRule === "bestsellers"
        ? input.autoRule
        : existing.autoRule
      : null;
  const name = input.name?.trim() ?? existing.name;
  const slug = (input.slug?.trim() || existing.slug).trim();
  const homeSlot =
    input.homeSlot === null || input.homeSlot === ""
      ? null
      : input.homeSlot !== undefined
        ? parseHomeSlot(input.homeSlot)
        : existing.homeSlot;
  const check = canSaveCollection({ name, slug, mode, autoRule });
  if (!check.ok) return { ok: false as const, error: check.error, status: 400 };
  if (await slugTaken(slug, id)) {
    return { ok: false as const, error: "That slug is already used.", status: 409 };
  }

  if (homeSlot) await clearHomeSlot(homeSlot, id);

  const { error } = await db()
    .from("collections")
    .update({
      name,
      slug,
      description:
        input.description !== undefined
          ? input.description.trim() || null
          : existing.description,
      mode,
      auto_rule: autoRule,
      home_slot: homeSlot,
      active: input.active !== undefined ? input.active : existing.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };

  if (mode === "manual" && input.productIds) {
    await replaceCollectionProducts(id, input.productIds);
  }
  if (mode === "auto") {
    await db().from("collection_products").delete().eq("collection_id", id);
  }

  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}`);
  revalidatePath("/");
  revalidatePath("/admin/home");
  revalidatePath(`/collections/${slug}`);
  return { ok: true as const, collection: await getAdminCollection(id) };
}

async function clearHomeSlot(slot: CollectionHomeSlot, exceptId?: string) {
  let q = db()
    .from("collections")
    .update({ home_slot: null })
    .eq("home_slot", slot);
  if (exceptId) q = q.neq("id", exceptId);
  await q;
}

export async function deleteAdminCollection(id: string) {
  const { error } = await db().from("collections").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  revalidatePath("/admin/collections");
  return { ok: true as const };
}

async function replaceCollectionProducts(collectionId: string, productIds: string[]) {
  await db().from("collection_products").delete().eq("collection_id", collectionId);
  const rows = productIds
    .map((pid) => pid.trim())
    .filter(Boolean)
    .map((product_id, sort_order) => ({
      collection_id: collectionId,
      product_id,
      sort_order,
    }));
  if (!rows.length) return;
  const { error } = await db().from("collection_products").insert(rows);
  if (error) throw error;
}

/** Resolve product IDs for a collection (manual picks or auto rule). */
export async function resolveCollectionProductIds(
  collection: AdminCollection
): Promise<string[]> {
  if (collection.mode === "manual") return collection.productIds;
  if (collection.autoRule === "featured") {
    const { data, error } = await db()
      .from("products")
      .select("id")
      .eq("featured", true)
      .eq("status", "published")
      .limit(24);
    if (error) throw error;
    return (data ?? []).map((r) => String((r as { id: string }).id));
  }
  // bestsellers: featured first, then recent published
  const { data: featured } = await db()
    .from("products")
    .select("id")
    .eq("featured", true)
    .eq("status", "published")
    .limit(8);
  const ids = (featured ?? []).map((r) => String((r as { id: string }).id));
  if (ids.length >= 8) return ids;
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
  return ids;
}

const PRODUCT_EMBED = `
  *,
  product_images ( url, sort_order, source ),
  product_variants ( id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default ),
  product_reviews ( name, rating, review_date, comment, verified, image, is_demo )
`;

/** Products for a home rail when an active collection claims that slot. */
export async function fetchProductsForHomeSlot(
  slot: CollectionHomeSlot,
  includeDemo = false
): Promise<Product[] | null> {
  const { data: col, error } = await db()
    .from("collections")
    .select("id")
    .eq("home_slot", slot)
    .eq("active", true)
    .maybeSingle();
  if (error || !col) return null;

  const collection = await getAdminCollection(String((col as { id: string }).id));
  if (!collection) return null;
  const ids = await resolveCollectionProductIds(collection);
  if (!ids.length) return [];

  const { data: rows, error: pErr } = await db()
    .from("products")
    .select(PRODUCT_EMBED)
    .in("id", ids)
    .eq("status", "published");
  if (pErr) throw pErr;

  const byId = new Map<string, Product>();
  for (const row of rows ?? []) {
    const p = mapProduct(row as Record<string, unknown>, {
      includeDemoReviews: includeDemo,
    });
    if (!p) continue;
    if (!includeDemo && p.isDemo) continue;
    byId.set(String((row as { id: string }).id), p);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
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

  const byId = new Map<string, Product>();
  for (const row of rows ?? []) {
    const p = mapProduct(row as Record<string, unknown>, {
      includeDemoReviews: includeDemo,
    });
    if (!p) continue;
    if (!includeDemo && p.isDemo) continue;
    byId.set(String((row as { id: string }).id), p);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
}

export type StorefrontCollectionRail = {
  id: string;
  name: string;
  slug: string;
  products: Product[];
};

/** Active collections that are not bound to a reserved home slot. */
export async function fetchExtraCollectionRails(
  includeDemo = false
): Promise<StorefrontCollectionRail[]> {
  const collections = await listAdminCollections();
  const extras = extraHomeCollectionRails(collections);
  const rails: StorefrontCollectionRail[] = [];
  for (const collection of extras) {
    const ids = await resolveCollectionProductIds(collection);
    const products = await productsForIds(ids, includeDemo);
    if (!products.length) continue;
    rails.push({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      products: products.slice(0, 8),
    });
  }
  return rails;
}

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

export async function setProductCollections(
  productId: string,
  rawIds: unknown
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const desired = parseCollectionIds(rawIds);
  if (desired == null) return { ok: true };

  let collections: AdminCollection[];
  try {
    collections = await listAdminCollections();
  } catch {
    return { ok: true };
  }
  const assignable = new Set(
    collections.filter((c) => canAssignProductToCollection(c.mode)).map((c) => c.id)
  );
  const wanted = new Set(desired.filter((id) => assignable.has(id)));

  const { data: links, error } = await db()
    .from("collection_products")
    .select("collection_id")
    .eq("product_id", productId);
  if (error) return { ok: false, error: error.message, status: 500 };

  const current = new Set(
    (links ?? [])
      .map((row) => String((row as { collection_id: string }).collection_id))
      .filter((id) => assignable.has(id))
  );

  const toAdd = Array.from(wanted).filter((id) => !current.has(id));
  const toRemove = Array.from(current).filter((id) => !wanted.has(id));

  if (toRemove.length) {
    const { error: delErr } = await db()
      .from("collection_products")
      .delete()
      .eq("product_id", productId)
      .in("collection_id", toRemove);
    if (delErr) return { ok: false, error: delErr.message, status: 500 };
  }

  for (const collectionId of toAdd) {
    const { data: last } = await db()
      .from("collection_products")
      .select("sort_order")
      .eq("collection_id", collectionId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sortOrder = last?.[0]
      ? Number((last[0] as { sort_order: number }).sort_order) + 1
      : 0;
    const { error: insErr } = await db()
      .from("collection_products")
      .insert({
        collection_id: collectionId,
        product_id: productId,
        sort_order: sortOrder,
      });
    if (insErr && insErr.code !== "23505") {
      return { ok: false, error: insErr.message, status: 500 };
    }
  }

  revalidatePath("/admin/collections");
  revalidatePath("/");
  for (const c of collections) {
    if (wanted.has(c.id) || current.has(c.id)) {
      revalidatePath(`/admin/collections/${c.id}`);
      revalidatePath(`/collections/${c.slug}`);
    }
  }
  return { ok: true };
}
