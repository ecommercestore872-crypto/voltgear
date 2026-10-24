import { revalidateAfterPublish, revalidateShopMerchandising } from "@/lib/revalidate-storefront";
import { assignableCategoryRefs } from "@/lib/db/admin-category-store";
import { extraCategoryPathsToRevalidate } from "@/lib/db/category-rules";
import {
  bumpAdminProductsCache,
  editorDocument,
  getAdminProduct,
  isProductSlugTaken,
} from "@/lib/db/admin-product-read-store";
import {
  canPublish,
  canSaveDraft,
  mergeProductForm,
  withGeneratedVariants,
  type ProductDocument,
} from "@/lib/db/publish";
import { getServiceClient } from "@/lib/supabase/server";
import { isProductRevision, isRecord, ProductInputError, validateProductCollections, validateProductInput } from "@/lib/admin-product-input";

function db() {
  return getServiceClient({ admin: true });
}

type WriteAction = "create" | "save" | "publish" | "unpublish" | "discard";
type WriteFailure = { ok: false; error: string; status: number };
const invalid = (error: unknown): WriteFailure => ({ ok: false, error: error instanceof ProductInputError ? error.message : "Invalid product input.", status: 400 });

function validateWrite(doc: unknown, collections?: unknown, revision?: unknown, existing = true) {
  validateProductInput(doc);
  validateProductCollections(collections);
  if (existing && !isProductRevision(revision)) throw new ProductInputError("A valid editor revision is required. Reload this product before saving.");
}

/** No fallback: v2 is the only catalog mutation path, and must be installed first. */
async function writeProduct(action: WriteAction, id: string | null, document: ProductDocument | null, collections?: unknown, revision?: unknown) {
  const { data, error } = await db().rpc("admin_write_product_v2", {
    p_action: action, p_product_id: id, p_document: document ?? {},
    p_collection_ids: collections ?? null, p_expected_admin_revision: revision ?? null,
  });
  if (error) {
    if (error.code === "40001" || error.message?.startsWith("CONFLICT:")) return { ok: false as const, error: "This product or its inventory changed. Reload and review the latest values before trying again.", status: 409 };
    if (error.code === "PGRST202" || error.code === "42501") return { ok: false as const, error: "Safe product writes are not available. The approved v2 database migration is required; no legacy write was attempted.", status: 503 };
    if (error.code === "23505") return { ok: false as const, error: "That product slug is already used.", status: 409 };
    if (error.message?.startsWith("BUSINESS_ERROR:")) return { ok: false as const, error: error.message.slice("BUSINESS_ERROR:".length).trim(), status: 400 };
    return { ok: false as const, error: "The product change could not be completed.", status: 500 };
  }
  if (!isRecord(data) || data.ok !== true || typeof data.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id) || (id !== null && data.id !== id) || !isProductRevision(data.admin_revision) || !isProductRevision(data.inventory_revision)
      || (data.quantity !== null && (typeof data.quantity !== "number" || !Number.isInteger(data.quantity) || data.quantity < 0 || data.quantity > 2_147_483_647))
      || !["in-stock", "low-stock", "out-of-stock"].includes(data.stock_status as string)) {
    return { ok: false as const, error: "The write outcome could not be confirmed. Reload before retrying.", status: 502 };
  }
  return { ok: true as const, id: data.id, adminRevision: data.admin_revision, inventoryRevision: data.inventory_revision,
    quantity: data.quantity as number | null, stockStatus: data.stock_status as string };
}

export async function createAdminProduct(doc: unknown, rawCollectionIds?: unknown) {
  let merged: ProductDocument;
  try { validateWrite(doc, rawCollectionIds, undefined, false); merged = mergeProductForm(undefined, doc as ProductDocument); }
  catch (error) { return invalid(error); }
  const save = canSaveDraft(merged, await assignableCategoryRefs());
  if (!save.ok) return { ok: false as const, error: save.error, status: 400 };
  if (await isProductSlugTaken(merged.slug)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const result = await writeProduct("create", null, merged, rawCollectionIds);
  if (!result.ok) return result;
  bumpAdminProductsCache();
  void revalidateAfterPublish("/admin/products");
  return result;
}

export async function saveAdminProduct(id: string, doc: unknown, collectionIds?: unknown, expectedRevision?: unknown) {
  try { validateWrite(doc, collectionIds, expectedRevision); } catch (error) { return invalid(error); }
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  let merged: ProductDocument;
  try { merged = mergeProductForm(editorDocument(current), doc as ProductDocument); validateProductInput(merged); } catch (error) { return invalid(error); }
  const save = canSaveDraft(merged, await assignableCategoryRefs());
  if (!save.ok) return { ok: false as const, error: save.error, status: 400 };
  if (await isProductSlugTaken(merged.slug, id)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const result = await writeProduct("save", id, merged, collectionIds, expectedRevision);
  if (!result.ok) return result;
  bumpAdminProductsCache();
  void revalidateAfterPublish(`/admin/products/${id}`, "/admin/products");
  return result;
}

export async function publishAdminProduct(
  id: string,
  doc: unknown,
  collectionIds?: unknown,
  expectedRevision?: unknown,
) {
  try { validateWrite(doc, collectionIds, expectedRevision); } catch (error) { return invalid(error); }
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  let merged: ProductDocument;
  try { merged = mergeProductForm(editorDocument(current), doc as ProductDocument); validateProductInput(merged); } catch (error) { return invalid(error); }
  const gate = canPublish(merged, await assignableCategoryRefs());
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  if (await isProductSlugTaken(merged.slug, id)) {
    return { ok: false as const, error: "That product name is already used.", status: 409 };
  }
  const written = await writeProduct("publish", id, withGeneratedVariants(merged), collectionIds, expectedRevision);
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
  return written;
}

export async function unpublishAdminProduct(id: string, expectedRevision?: unknown) {
  if (!isProductRevision(expectedRevision)) return invalid(new ProductInputError("A valid editor revision is required. Reload this product."));
  const current = await getAdminProduct(id);
  if (!current) return { ok: false as const, error: "Product not found.", status: 404 };
  const result = await writeProduct("unpublish", id, null, null, expectedRevision);
  if (!result.ok) return result;
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
  return result;
}

export async function discardAdminProductDraft(id: string, expectedRevision?: unknown) {
  if (!isProductRevision(expectedRevision)) return invalid(new ProductInputError("A valid editor revision is required. Reload this product."));
  const result = await writeProduct("discard", id, null, null, expectedRevision);
  if (!result.ok) return result;
  bumpAdminProductsCache();
  void revalidateAfterPublish(`/admin/products/${id}`, "/admin/products");
  return result;
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
