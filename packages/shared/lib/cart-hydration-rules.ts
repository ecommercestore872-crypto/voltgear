/**
 * Cart localStorage hydration rules.
 * Prevents a late hydrate read of "[]" (or empty) from wiping an add-to-cart
 * that landed before the hydrate effect finished.
 */

export type CartHydrationLine = {
  slug: string;
  quantity: number;
  price: number;
  name?: string;
  variantKey?: string;
};

export const CART_STORAGE_KEY = "ecomm-cart";

export function parseCartStorage(raw: string | null): CartHydrationLine[] {
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartHydrationLine =>
        Boolean(
          line &&
            typeof line === "object" &&
            typeof (line as CartHydrationLine).slug === "string" &&
            typeof (line as CartHydrationLine).quantity === "number" &&
            typeof (line as CartHydrationLine).price === "number",
        ),
    );
  } catch {
    return [];
  }
}

/**
 * If the in-memory cart already has lines (user added before hydrate completed),
 * keep them. Otherwise restore from storage.
 */
export function mergeCartHydration<T extends CartHydrationLine>(
  current: readonly T[],
  stored: readonly T[],
): T[] {
  if (current.length > 0) return [...current];
  return [...stored];
}

export function cartHasSlug(
  items: readonly CartHydrationLine[],
  slug: string,
): boolean {
  return items.some(
    (i) => i.slug === slug && i.quantity > 0 && Number.isFinite(i.price) && i.price > 0,
  );
}
