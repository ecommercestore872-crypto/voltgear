import type { Product } from "@/lib/types";

/** Pakistan has no DST: fixed UTC+5. */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Admin "datetime-local" value (Pakistan time) -> ISO instant. */
export function pktInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(`${value}:00+05:00`);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** ISO instant -> "datetime-local" value in Pakistan time. */
export function isoToPktInput(iso?: string): string {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(ms) ? "" : new Date(ms + PKT_OFFSET_MS).toISOString().slice(0, 16);
}

/**
 * Applies the sale on the SERVER clock (`now`). Active sale: price becomes the sale
 * price and the regular price moves to compareAtPrice. Expired/invalid: regular price.
 * No sale end time = sale price applies with no countdown.
 */
export function withSale<T extends Pick<Product, "price" | "compareAtPrice" | "salePrice" | "saleEndsAt">>(
  p: T,
  now: number,
): T {
  if (p.salePrice == null) return p;
  const end = p.saleEndsAt ? Date.parse(p.saleEndsAt) : null;
  const active =
    p.salePrice > 0 && p.salePrice < p.price && (end === null || (!Number.isNaN(end) && end > now));
  return active
    ? { ...p, price: p.salePrice, compareAtPrice: p.price, salePrice: undefined }
    : { ...p, salePrice: undefined, saleEndsAt: undefined };
}
