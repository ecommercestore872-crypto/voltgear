/** Meta uses the persisted product slug throughout. No Meta catalog is configured. */
export const META_PRODUCTION_PIXEL_ID = "1707417188053568";
export type MetaItem = { productId?: string; name?: string; price: number; quantity: number };

export function metaCommerceData(items: MetaItem[], value: number) {
  if (!Array.isArray(items) || !items.length || !Number.isFinite(value) || value < 0) return null;
  if (items.some((i) => !i || typeof i.productId !== "string" || !i.productId.trim() ||
    typeof i.price !== "number" || !Number.isFinite(i.price) || i.price <= 0 ||
    !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.price * i.quantity))) return null;
  const numItems = items.reduce((n, i) => n + i.quantity, 0);
  if (!Number.isSafeInteger(numItems)) return null;
  return {
    content_ids: items.map((i) => i.productId!.trim()),
    content_type: "product" as const,
    contents: items.map((i) => ({ id: i.productId!.trim(), quantity: i.quantity, item_price: i.price })),
    num_items: numItems,
    value,
    currency: "PKR" as const,
  };
}

export function acceptedMetaPurchase(status: number, data: unknown) {
  if (status < 200 || status >= 300 || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.ok !== true || row.isDemo === true || typeof row.orderId !== "string" || !row.orderId.trim() ||
    typeof row.total !== "number" || !Array.isArray(row.lines)) return null;
  const items = row.lines.map((line) => ({ productId: line?.slug, name: line?.name, price: line?.price, quantity: line?.quantity }));
  if (!metaCommerceData(items, row.total)) return null;
  return { orderId: row.orderId.trim(), items, value: row.total };
}

export function metaEnvironmentAllowed(input: { pixelId?: string; testMode?: string; vercelEnv?: string; host?: string }) {
  if (!/^\d{5,30}$/.test(input.pixelId ?? "")) return false;
  if (input.testMode === "true") return input.pixelId !== META_PRODUCTION_PIXEL_ID && input.vercelEnv !== "production";
  return input.vercelEnv !== "preview" && input.vercelEnv !== "development" &&
    (input.host === "buyntryy.com" || input.host === "www.buyntryy.com");
}

export function metaStorefrontPath(path: string) {
  return !/^\/(admin|studio|demo|test|api|order|track)(\/|$)/i.test(path);
}
