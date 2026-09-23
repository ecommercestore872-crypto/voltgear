export type AdminSearchHit = {
  kind: "order" | "product" | "customer";
  label: string;
  href: string;
  score: number;
};

export function scoreAdminSearchHits(
  query: string,
  data: {
    orders: { orderId: string }[];
    products: { id: string; name: string; slug: string }[];
    customers: { key: string; name: string; email: string; phone: string }[];
  },
  limit = 12
): AdminSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: AdminSearchHit[] = [];

  for (const o of data.orders) {
    const id = o.orderId.toLowerCase();
    if (!id.includes(q)) continue;
    const score = id.startsWith(q) ? 100 : 80;
    hits.push({
      kind: "order",
      label: o.orderId,
      href: `/admin/orders/${encodeURIComponent(o.orderId)}`,
      score,
    });
  }

  for (const p of data.products) {
    const name = p.name.toLowerCase();
    const slug = p.slug.toLowerCase();
    if (!name.includes(q) && !slug.includes(q)) continue;
    const score = name.startsWith(q) || slug.startsWith(q) ? 70 : 50;
    hits.push({
      kind: "product",
      label: p.name,
      href: `/admin/products/${p.id}`,
      score,
    });
  }

  for (const c of data.customers) {
    const blob = `${c.name} ${c.email} ${c.phone}`.toLowerCase();
    if (!blob.includes(q)) continue;
    hits.push({
      kind: "customer",
      label: c.name || c.email || c.phone || c.key,
      href: `/admin/customers/${encodeURIComponent(c.key)}`,
      score: 40,
    });
  }

  return hits.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, limit);
}
