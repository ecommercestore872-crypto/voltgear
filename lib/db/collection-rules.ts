export type CollectionMode = "manual" | "auto";
export type CollectionAutoRule = "featured" | "bestsellers";
export type CollectionHomeSlot = "bestsellers" | "featured" | "offers";

export const COLLECTION_HOME_SLOTS: {
  id: CollectionHomeSlot;
  label: string;
}[] = [
  { id: "bestsellers", label: "Home · Best Sellers rail" },
  { id: "featured", label: "Home · Featured product" },
  { id: "offers", label: "Home · Best Offers rail" },
];

export function parseHomeSlot(raw: unknown): CollectionHomeSlot | null {
  if (raw === "bestsellers" || raw === "featured" || raw === "offers") return raw;
  return null;
}

export function slugifyCollectionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function canSaveCollection(input: {
  name?: string;
  slug?: string;
  mode?: string;
  autoRule?: string | null;
}): { ok: true } | { ok: false; error: string } {
  if (!input.name?.trim()) return { ok: false, error: "Collection name is required." };
  const slug = (input.slug?.trim() || slugifyCollectionName(input.name)).trim();
  if (!slug) return { ok: false, error: "Collection slug is required." };
  if (input.mode !== "manual" && input.mode !== "auto") {
    return { ok: false, error: "Mode must be manual or auto." };
  }
  if (input.mode === "auto") {
    if (input.autoRule !== "featured" && input.autoRule !== "bestsellers") {
      return { ok: false, error: "Auto collections need a rule: featured or bestsellers." };
    }
  }
  return { ok: true };
}

/** Map common merchandising names onto the existing home rails. */
export function inferHomeSlotFromName(name: string): CollectionHomeSlot | null {
  const slug = slugifyCollectionName(name);
  if (slug === "bestsellers" || slug === "best-seller" || slug === "best-sellers") {
    return "bestsellers";
  }
  if (slug === "featured") return "featured";
  if (slug === "offers" || slug === "best-offers" || slug === "best-offer") {
    return "offers";
  }
  return null;
}

/** `null` = leave memberships unchanged; otherwise the exact set of collection ids. */
export function parseCollectionIds(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => String(id).trim())
    .filter(Boolean);
}

export function canAssignProductToCollection(mode: string): boolean {
  return mode === "manual";
}

export function membershipIdsForProduct(
  collections: { id: string; productIds: string[] }[],
  productId: string
): string[] {
  return collections.filter((c) => c.productIds.includes(productId)).map((c) => c.id);
}

export function extraHomeCollectionRails<
  T extends { id: string; active: boolean; homeSlot: CollectionHomeSlot | null },
>(collections: T[]): T[] {
  return collections.filter((c) => c.active && c.homeSlot == null);
}

export type CollectionPickerItem = {
  id: string;
  name: string;
  slug: string;
  mode: CollectionMode;
  autoRule: CollectionAutoRule | null;
  homeSlot: CollectionHomeSlot | null;
};

export function collectionPickerHint(input: {
  homeSlot: CollectionHomeSlot | null;
  mode: CollectionMode;
  autoRule: CollectionAutoRule | null;
}): string {
  if (input.mode === "auto") {
    return input.autoRule === "featured"
      ? "Automatic · Featured flag"
      : "Automatic · Best sellers rule";
  }
  if (input.homeSlot === "bestsellers") return "Home · Best Sellers rail";
  if (input.homeSlot === "featured") return "Home · Featured product";
  if (input.homeSlot === "offers") return "Home · Best Offers rail";
  return "Home · product rail";
}
