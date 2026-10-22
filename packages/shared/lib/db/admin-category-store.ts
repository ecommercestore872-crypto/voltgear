import { unstable_cache } from "next/cache";

import { revalidateAdminCacheTag, revalidateShopMerchandising } from "@/lib/revalidate-storefront";
import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import { canDeleteShopType, canSaveShopType, shopTypeSlugTaken } from "@/lib/db/category-rules";
import { slugify } from "@/lib/db/publish";
import { getServiceClient } from "@/lib/supabase/server";

const ADMIN_SHOP_TYPES_CACHE_TAG = "admin-shop-types";

function db() {
  return getServiceClient({ admin: true });
}

function revalidateShopTypePaths(slug?: string) {
  void revalidateShopMerchandising(
    "/",
    "/products",
    "/search",
    "/sitemap.xml",
    ...(slug ? [`/products/${slug}`] : []),
  );
}

function mapCategoryRow(
  row: Record<string, unknown>,
  counts: Record<string, number>,
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
    active: row.active !== false,
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
  return (data ?? []).map((row) => ({ id: String(row.id), slug: String(row.slug) }));
}

export async function assignableCategoryRefs(): Promise<{ slug: string }[]> {
  try {
    const types = await listAdminShopTypes();
    return types.map((type) => ({ slug: type.slug }));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "42P01") return [];
    throw error;
  }
}

export async function ensureFallbackShopTypes() {
  const { data, error } = await db().from("categories").select("slug");
  if (error) return;
  const have = new Set((data ?? []).map((row) => String((row as { slug: string }).slug)));
  const missing = FALLBACK_SHOP_TYPES.filter((type) => !have.has(type.slug));
  if (!missing.length) return;
  await db().from("categories").insert(
    missing.map((type) => ({
      name: type.name,
      slug: type.slug,
      description: type.description,
      image_url: type.imageUrl ?? null,
      sort_order: type.sortOrder,
    })),
  );
}

async function listAdminShopTypesUncached(): Promise<ShopType[]> {
  await ensureFallbackShopTypes();
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

function bumpAdminShopTypesCache() {
  revalidateAdminCacheTag(ADMIN_SHOP_TYPES_CACHE_TAG);
  revalidateAdminCacheTag("admin-products");
}

export async function listAdminShopTypes(): Promise<ShopType[]> {
  return unstable_cache(listAdminShopTypesUncached, ["admin-shop-types-v1"], {
    revalidate: 300,
    tags: [ADMIN_SHOP_TYPES_CACHE_TAG, "admin-products"],
  })();
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
  active?: boolean;
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
      active: doc.active ?? true,
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
  bumpAdminShopTypesCache();
  revalidateShopTypePaths(slug);
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminShopType(
  id: string,
  doc: {
    name?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
    active?: boolean;
  },
) {
  const current = await getAdminShopType(id);
  if (!current) return { ok: false as const, error: "Shop type not found.", status: 404 };
  const name = doc.name?.trim() ?? "";
  const gate = canSaveShopType({ name, slug: current.slug });
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  const nextImageUrl =
    doc.imageUrl !== undefined ? doc.imageUrl?.trim() || null : current.imageUrl?.trim() || null;
  const { error } = await db()
    .from("categories")
    .update({
      name,
      description: doc.description?.trim() || null,
      image_url: nextImageUrl,
      sort_order:
        doc.sortOrder != null && Number.isFinite(Number(doc.sortOrder))
          ? Number(doc.sortOrder)
          : current.sortOrder,
      active: doc.active ?? current.active ?? true,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminShopTypesCache();
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
  bumpAdminShopTypesCache();
  revalidateShopTypePaths(current.slug);
  return { ok: true as const };
}
