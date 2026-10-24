import { optionKey } from "@/lib/variant-options-rules";
import type { ProductDocument } from "@/lib/db/publish";

export type InventoryIntent = { mode: "preserve" } | {
  mode: "adjust"; expectedRevision: string; quantity: number | null;
  stockStatus: "in-stock" | "low-stock" | "out-of-stock";
};
export class ProductInputError extends Error {}
const fail = (field: string, detail = "has an invalid value"): never => { throw new ProductInputError(`${field} ${detail}.`); };
export const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const isProductRevision = (value: unknown): value is string => typeof value === "string" && /^(0|[1-9]\d{0,18})$/.test(value) && BigInt(value) <= BigInt("9223372036854775807");
export function readProductRevision(value: unknown): string | undefined {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return undefined;
  const revision = typeof value === "string" || typeof value === "number" ? String(value) : undefined;
  return isProductRevision(revision) ? revision : undefined;
}
const has = (value: object, key: string) => Object.hasOwn(value, key);
const statuses = ["in-stock", "low-stock", "out-of-stock"];
function text(value: unknown, field: string) { if (typeof value !== "string" || value.length > 100_000) fail(field, "must be text"); }
function bool(value: unknown, field: string) { if (typeof value !== "boolean") fail(field, "must be true or false"); }
function money(value: unknown, field: string, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER / 100 || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) fail(field, "must be a finite, non-negative amount with at most two decimals");
}
function units(value: unknown, field: string) {
  if (value !== null && (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2_147_483_647)) fail(field, "must be a whole number from 0 to 2147483647, or explicit null");
}
function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value) || value.length > 1000) return fail(field, "must be an array of at most 1000 items");
  return value;
}
function record(value: unknown, field: string): Record<string, unknown> { if (!isRecord(value)) return fail(field, "must be an object"); return value; }
function stringFields(row: Record<string, unknown>, fields: string[], prefix: string) { for (const key of fields) if (row[key] !== undefined) text(row[key], `${prefix}${key}`); }
function pricePair(row: Record<string, unknown>, prefix = "", basePrice?: number) {
  if (row.price !== undefined) money(row.price, `${prefix}price`);
  if (row.compareAtPrice !== undefined) money(row.compareAtPrice, `${prefix}compareAtPrice`, true);
  const selling = typeof row.price === "number" ? row.price : basePrice;
  if (typeof row.compareAtPrice === "number" && selling !== undefined && row.compareAtPrice < selling) fail(`${prefix}compareAtPrice`, "must not be below the selling price");
}

/** Validate supplied values before merge/sanitization. Omission is not explicit null. */
export function validateProductInput(value: unknown): asserts value is ProductDocument {
  const row = record(value, "Product document");
  stringFields(row, ["name", "slug", "brand", "sku", "category", "shortDescription", "badge", "tiktokUrl", "instagramUrl"], "");
  pricePair(row);
  if (row.costPrice !== undefined) money(row.costPrice, "costPrice", true);
  if (has(row, "quantity") && row.quantity !== undefined) units(row.quantity, "quantity");
  if (row.stockStatus !== undefined && !statuses.includes(row.stockStatus as string)) fail("stockStatus");
  for (const key of ["featured", "isDemo", "freeShipping", "colorEnabled", "sizeEnabled"]) if (row[key] !== undefined) bool(row[key], key);
  for (const key of ["images", "cloudinaryImages", "features", "compatibility", "inTheBox"]) if (row[key] !== undefined) list(row[key], key).forEach((item, i) => text(item, `${key}[${i}]`));
  for (const [key, fields] of [["specifications", ["label", "value"]], ["productFaq", ["question", "answer"]]] as const) {
    if (row[key] !== undefined) list(row[key], key).forEach((item, i) => {
      const child = record(item, `${key}[${i}]`);
      for (const field of fields) text(child[field], `${key}[${i}].${field}`);
    });
  }
  if (row.productVideo !== undefined) stringFields(record(row.productVideo, "productVideo"), ["url", "poster", "cloudinaryPublicId"], "productVideo.");
  if (typeof row.description === "string") text(row.description, "description");
  else if (row.description !== undefined && row.description !== null) list(row.description, "description").forEach((item, i) => record(item, `description[${i}]`));
  for (const axis of ["colorOptions", "sizeOptions"]) {
    if (row[axis] === undefined) continue;
    const keys = new Set<string>(); const names = new Set<string>();
    list(row[axis], axis).forEach((item, i) => {
      const child = record(item, `${axis}[${i}]`);
      text(child.name, `${axis}[${i}].name`); text(child.key, `${axis}[${i}].key`); bool(child.enabled, `${axis}[${i}].enabled`);
      if (child.image !== undefined) text(child.image, `${axis}[${i}].image`);
      const key = child.key as string; const name = (child.name as string).trim().toLowerCase();
      if (!name || !key || optionKey(key) !== key || !optionKey(name) || keys.has(key) || names.has(name)) fail(axis, "must contain nonempty unique option names and canonical keys");
      keys.add(key); names.add(name);
    });
  }
  const count = (key: string) => Array.isArray(row[key]) ? row[key].filter((item) => isRecord(item) && item.enabled === true).length : 0;
  if (row.colorEnabled && row.sizeEnabled && count("colorOptions") * count("sizeOptions") > 1000) fail("Variants", "must not exceed 1000 combinations");
  if (row.variants !== undefined) {
    const keys = new Set<string>(); let defaults = 0;
    list(row.variants, "variants").forEach((item, i) => {
      const child = record(item, `variants[${i}]`); const prefix = `variants[${i}].`;
      stringFields(child, ["_key", "name", "sku", "image"], prefix);
      if (typeof child.name !== "string" || !child.name.trim()) fail(`${prefix}name`);
      const key = child._key ?? `v${i}`;
      if (typeof key !== "string" || !key.trim() || keys.has(key)) fail("variants", "must have unique nonempty keys");
      keys.add(key as string); pricePair(child, prefix, typeof row.price === "number" ? row.price : undefined);
      if (!statuses.includes(child.stockStatus as string)) fail(`${prefix}stockStatus`);
      if (child.isDefault !== undefined) bool(child.isDefault, `${prefix}isDefault`);
      if (child.isDefault === true) defaults++;
    });
    if (defaults > 1) fail("variants", "must not have multiple default options");
  }
  if (row.addons !== undefined) list(row.addons, "addons").forEach((item, i) => {
    const child = record(item, `addons[${i}]`);
    stringFields(child, ["_key", "name", "image", "badge", "description"], `addons[${i}].`);
    money(child.price, `addons[${i}].price`);
  });
  // Legacy read projections may be submitted, but never become publication authority.
  if (row.rating !== undefined && row.rating !== null && (typeof row.rating !== "number" || !Number.isFinite(row.rating) || row.rating < 0 || row.rating > 5)) fail("rating");
  if (row.reviewCount !== undefined) units(row.reviewCount, "reviewCount");
  if (row.reviews !== undefined) list(row.reviews, "reviews").forEach((item, i) => {
    const child = record(item, `reviews[${i}]`);
    stringFields(child, ["name", "date", "comment", "reply", "image"], `reviews[${i}].`);
    if (child.rating !== undefined && (typeof child.rating !== "number" || !Number.isFinite(child.rating) || child.rating < 1 || child.rating > 5)) fail(`reviews[${i}].rating`);
    for (const key of ["verified", "isDemo"]) if (child[key] !== undefined) bool(child[key], `reviews[${i}].${key}`);
  });
  if (row.inventoryIntent !== undefined) {
    const intent = record(row.inventoryIntent, "inventoryIntent");
    if (intent.mode === "preserve") {
      if (Object.keys(intent).some((key) => key !== "mode")) fail("inventoryIntent");
    } else if (intent.mode === "adjust") {
      if (Object.keys(intent).some((key) => !["mode", "expectedRevision", "quantity", "stockStatus"].includes(key))) fail("inventoryIntent");
      if (!isProductRevision(intent.expectedRevision)) fail("inventoryIntent.expectedRevision");
      units(intent.quantity, "inventoryIntent.quantity");
      if (!statuses.includes(intent.stockStatus as string)) fail("inventoryIntent.stockStatus");
      if (has(row, "quantity") && row.quantity !== intent.quantity) fail("inventoryIntent", "quantity must match the editor value");
      if (row.stockStatus !== undefined && row.stockStatus !== intent.stockStatus) fail("inventoryIntent", "availability must match the editor value");
    } else fail("inventoryIntent.mode");
  }
  if (row._collectionIds !== undefined) validateProductCollections(row._collectionIds);
}

export function validateProductCollections(value: unknown): asserts value is string[] | null | undefined {
  if (value == null) return;
  const seen = new Set<string>();
  for (const id of list(value, "collectionIds")) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || seen.has(id.toLowerCase())) fail("collectionIds", "must contain unique valid collection UUIDs");
    seen.add((id as string).toLowerCase());
  }
}

export function productMutationRequest(body: unknown, create = false) {
  const envelope = record(body, "Request body");
  const action = envelope.action === undefined ? (create ? "create" : "save") : envelope.action;
  if (typeof action !== "string" || !(create ? ["create"] : ["save", "publish", "unpublish", "discard"]).includes(action)) fail("Action", "is not supported");
  const document = create && !has(envelope, "doc") ? envelope : envelope.doc;
  if (action === "create" || action === "save" || action === "publish") validateProductInput(document);
  else if (document !== undefined && !isRecord(document)) fail("Product document", "must be an object");
  validateProductCollections(envelope.collectionIds);
  if (!create && !isProductRevision(envelope.expectedAdminRevision)) fail("Editor revision", "is missing or invalid; reload the product");
  return { action: action as "create" | "save" | "publish" | "unpublish" | "discard", document: document as ProductDocument,
    collectionIds: envelope.collectionIds as string[] | null | undefined, expectedAdminRevision: envelope.expectedAdminRevision as string | undefined };
}

/** Blank optional inputs clear deliberately; invalid required inputs stay invalid. */
export function productNumberText(raw: string, optional = false, integer = false): number | null {
  if (!raw.trim()) { if (optional) return null; return fail("Price", "is required"); }
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim())) return fail(integer ? "Quantity" : "Price");
  const number = Number(raw);
  if (integer) units(number, "Quantity"); else money(number, "Price");
  return number;
}
