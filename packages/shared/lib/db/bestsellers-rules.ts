type ProductInput = {
  id: string;
  featured?: boolean;
  stockStatus?: string;
};

export function pickBestsellers(input: {
  products: ProductInput[];
  orderCounts: Record<string, number>;
  viewCounts: Record<string, number>;
  limit?: number;
}): string[] {
  const limit = input.limit ?? 8;
  const inStock = input.products.filter((p) => p.stockStatus !== "out-of-stock");
  const selected: string[] = [];
  const seen = new Set<string>();

  function take(id: string) {
    if (seen.has(id) || selected.length >= limit) return;
    seen.add(id);
    selected.push(id);
  }

  for (const p of inStock) {
    if (p.featured) take(p.id);
  }

  const byOrders = [...inStock]
    .filter((p) => (input.orderCounts[p.id] ?? 0) > 0)
    .sort((a, b) => (input.orderCounts[b.id] ?? 0) - (input.orderCounts[a.id] ?? 0));
  for (const p of byOrders) take(p.id);

  const byViews = [...inStock]
    .filter((p) => (input.viewCounts[p.id] ?? 0) > 0)
    .sort((a, b) => (input.viewCounts[b.id] ?? 0) - (input.viewCounts[a.id] ?? 0));
  for (const p of byViews) take(p.id);

  return selected;
}
