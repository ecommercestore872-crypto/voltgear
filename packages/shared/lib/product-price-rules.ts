/** Public commerce: only positive finite PKR amounts are purchasable. */
export function isPurchasablePrice(price: unknown): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

export function filterPurchasableProducts<T extends { price: number }>(
  products: T[],
): T[] {
  return products.filter((p) => isPurchasablePrice(p.price));
}
