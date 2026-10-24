import { isProductRevision, isRecord, ProductInputError } from "./admin-product-input";

export class CollectionInputError extends ProductInputError {}
export type CollectionMutationInput = { name?: string; slug?: string; description?: string | null; mode?: "manual" | "auto";
  autoRule?: string | null; homeSlot?: string | null; active?: boolean; productIds?: string[]; expectedRevision?: string; expectedSlotRevision?: string };
const invalid = (field: string): never => { throw new CollectionInputError(`${field} is missing or invalid. Reload before retrying when a revision is missing.`); };
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const slots = ["bestsellers", "featured", "offers"];
export function validateCollectionProductIds(value: unknown): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 1000 || value.some((id) => !uuid(id)) || new Set(value).size !== value.length) invalid("productIds");
}
export function collectionMutationRequest(value: unknown, action: "create" | "update" | "delete") {
  if (!isRecord(value)) return invalid("Request body");
  const allowed = action === "delete" ? ["expectedRevision"] : ["name", "slug", "description", "mode", "autoRule", "homeSlot", "active", "productIds", "expectedRevision", "expectedSlotRevision"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid("Request field");
  if (value.expectedRevision !== undefined && !isProductRevision(value.expectedRevision)) invalid("Collection revision");
  if (action !== "create" && !isProductRevision(value.expectedRevision)) invalid("Collection revision");
  if (action === "delete") return value as { expectedRevision: string };
  for (const key of ["name", "slug", "description"]) {
    if (value[key] === undefined || (key === "description" && value[key] === null)) continue;
    if (typeof value[key] !== "string" || (value[key] as string).length > (key === "description" ? 100_000 : 200)) invalid(key);
  }
  if (action === "create" && (typeof value.name !== "string" || !value.name.trim())) invalid("name");
  if (value.name !== undefined && !(value.name as string).trim()) invalid("name");
  if (value.slug !== undefined && (typeof value.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug))) invalid("slug");
  if (value.mode !== undefined && !["manual", "auto"].includes(value.mode as string)) invalid("mode");
  if (action === "create" && value.mode === undefined) invalid("mode");
  if (value.active !== undefined && typeof value.active !== "boolean") invalid("active");
  if (value.autoRule !== undefined && value.autoRule !== null && !["featured", "bestsellers"].includes(value.autoRule as string)) invalid("autoRule");
  if (value.mode === "auto" && !["featured", "bestsellers"].includes(value.autoRule as string)) invalid("autoRule");
  if (value.mode === "manual" && value.autoRule != null) invalid("autoRule");
  if (value.homeSlot !== undefined && value.homeSlot !== null && !slots.includes(value.homeSlot as string)) invalid("homeSlot");
  if (value.expectedSlotRevision !== undefined && !isProductRevision(value.expectedSlotRevision)) invalid("Home slot revision");
  if (value.homeSlot != null && value.active !== false && !isProductRevision(value.expectedSlotRevision)) invalid("Home slot revision");
  if (value.productIds !== undefined) validateCollectionProductIds(value.productIds);
  return value as CollectionMutationInput;
}
export function validateCollectionInput(value: unknown, action: "create" | "update" | "delete"): asserts value is CollectionMutationInput {
  collectionMutationRequest(value, action);
}

/** No optimistic acceptance of a malformed or mismatched mutation result. */
export function confirmedCollection(value: unknown, id?: string): boolean {
  if (!isRecord(value) || !uuid(value.id) || (id !== undefined && id !== value.id) || !isProductRevision(value.revision)) return false;
  try {
    validateCollectionProductIds(value.productIds);
    collectionMutationRequest({ name: value.name, slug: value.slug, description: value.description, mode: value.mode,
      autoRule: value.autoRule, homeSlot: value.homeSlot, active: value.active, productIds: value.productIds,
      expectedRevision: value.revision, expectedSlotRevision: isRecord(value.slotRevisions) ? value.slotRevisions[value.homeSlot as string] : undefined }, "update");
    return typeof value.active === "boolean" && typeof value.name === "string" && typeof value.slug === "string";
  } catch { return false; }
}
