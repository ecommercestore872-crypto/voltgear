import { revalidateAfterPublish, revalidateShopMerchandising } from "@/lib/revalidate-storefront";
import { assignableCategoryRefs } from "@/lib/db/admin-category-store";
import { extraCategoryPathsToRevalidate } from "@/lib/db/category-rules";
import { parseCollectionIds } from "@/lib/db/collection-rules";
import {
  bumpAdminProductsCache,
  editorDocument,
  getAdminProduct,
  getAdminProductForDraftSave,
  isProductSlugTaken,
} from "@/lib/db/admin-product-read-store";
import {
  canPublish,
  canSaveDraft,
  mergeProductForm,
  toImageRows,
  toLiveProductRow,
  toReviewRows,
  toVariantRows,
  withGeneratedVariants,
  type ProductDocument,
} from "@/lib/db/publish";
import { getServiceClient } from "@/lib/supabase/server";

function db() {
  return getServiceClient({ admin: true });
}

export async function createAdminProduct(doc: ProductDocument, rawCollectionIds?: unknown) {
  const merged = mergeProductForm(undefined, doc);
  const save = canSaveDraft(merged, await assignableCategoryRefs());
  if (!save.ok) return { ok: false as const, error: save.error, status: 400 };
  if (await isProductSlugTaken(merged.slug)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const { data, error } = await db().rpc("admin_create_product_draft", {
    p_draft: merged,
    p_collection_ids: parseCollectionIds(rawCollectionIds),
  });
  if (error) {
    if (error.code === "23505" || /duplicate key|unique constraint/i.test(error.message)) {
      return { ok: false as const, error: "That slug is already used.", status: 409 };
    }
    if (error.code === "PGRST202" || /admin_create_product_draft/i.test(error.message)) {
      return {
        ok: false as const,
        error: "Atomic product creation is not installed. Apply the latest database migrations.",
        status: 503,
      };
    }
    return { ok: false as const, error: error.message, status: 500 };
  }
  bumpAdminProductsCache();
  void revalidateAfterPublish("/admin/products");
  return { ok: true as const, id: String(data) };
}

export async function saveAdminProduct(id: string, doc: ProductDocument) {
  const current = await getAdminProductForDraftSave(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const merged = mergeProductForm(editorDocument(current), doc);
  const save = canSaveDraft(merged, await assignableCategoryRefs());
  if (!save.ok) return { ok: false as const, error: save.error, status: 400 };
  if (await isProductSlugTaken(merged.slug, id)) {
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
  bumpAdminProductsCache();
  void revalidateAfterPublish(`/admin/products/${id}`, "/admin/products");
  return { ok: true as const };
}

async function publishProductTransaction(
  id: string,
  doc: ProductDocument,
  rawCollectionIds?: unknown,
) {
  const collectionIds = parseCollectionIds(rawCollectionIds);
  const { error } = await db().rpc("admin_publish_product", {
    p_product_id: id,
    p_live_row: toLiveProductRow(doc),
    p_images: toImageRows(id, doc.images ?? []),
    p_variants: toVariantRows(id, doc.variants),
    p_reviews: toReviewRows(id, doc.reviews),
    p_collection_ids: collectionIds,
  });
  if (!error) return { ok: true as const };
  if (error.code === "23505" || /duplicate key|unique constraint/i.test(error.message)) {
    return { ok: false as const, error: "That slug is already used.", status: 409 };
  }
  if (error.code === "PGRST202" || /admin_publish_product/i.test(error.message)) {
    return {
      ok: false as const,
      error: "Atomic product publishing is not installed. Apply the latest database migrations.",
      status: 503,
    };
  }
  return { ok: false as const, error: error.message, status: 500 };
}

export async function publishAdminProduct(
  id: string,
  doc: ProductDocument,
  collectionIds?: unknown,
) {
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const merged = withGeneratedVariants(mergeProductForm(editorDocument(current), doc));
  const gate = canPublish(merged, await assignableCategoryRefs());
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  if (await isProductSlugTaken(merged.slug, id)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const written = await publishProductTransaction(id, merged, collectionIds);
  if (!written.ok) return written;
  void revalidateShopMerchandising(
    "/",
    "/products",
    ...extraCategoryPathsToRevalidate(current.category, merged.category),
    `/product/${merged.slug}`,
    "/search",
    "/api/store/products",
    `/admin/products/${id}`,
    "/admin/products",
    ...(current.slug !== merged.slug ? [`/product/${current.slug}`] : []),
  );
  bumpAdminProductsCache();
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
  void revalidateShopMerchandising(
    "/",
    "/products",
    ...extraCategoryPathsToRevalidate(current.category, current.category),
    `/product/${current.slug}`,
    "/api/store/products",
    `/admin/products/${id}`,
    "/admin/products",
  );
  bumpAdminProductsCache();
  return { ok: true as const };
}

export async function discardAdminProductDraft(id: string) {
  const { error } = await db()
    .from("products")
    .update({ draft: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminProductsCache();
  void revalidateAfterPublish(`/admin/products/${id}`, "/admin/products");
  return { ok: true as const };
}

export async function deleteAdminProduct(id: string) {
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const { error } = await db().from("products").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  // Images may also be referenced by other products, drafts or CMS content.
  // Product deletion must not delete shared bytes. Reference-aware orphan cleanup
  // is a separate operation; retaining an unused object is safer than breaking it.
  void revalidateShopMerchandising(
    "/",
    "/products",
    `/product/${current.slug}`,
    "/api/store/products",
    "/admin/products",
  );
  bumpAdminProductsCache();
  return { ok: true as const };
}
