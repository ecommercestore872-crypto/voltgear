/** Pure helpers for admin Web Push. No server or browser imports, so client and server can both use it. */

export type PushSubscriptionInput = { endpoint: string; p256dh: string; auth: string };

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

export function parsePushSubscription(body: unknown): PushSubscriptionInput | null {
  const b = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = text(b?.endpoint, 2048);
  const p256dh = text(b?.keys?.p256dh, 256);
  const auth = text(b?.keys?.auth, 128);
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) return null;
  return { endpoint, p256dh, auth };
}

export function parsePushEndpoint(body: unknown): string | null {
  return text((body as { endpoint?: unknown } | null)?.endpoint, 2048);
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const clip = (value: string | undefined, max: number) => (value ?? "").trim().slice(0, max);

/** Lock-screen text for a new order: who, how much, where, how it is paid. */
export function newOrderPush(order: {
  orderId: string;
  total: number;
  itemCount: number;
  name?: string;
  city?: string;
  payment?: string;
}): { title: string; body: string; url: string; tag: string } {
  const items = `${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`;
  const who = [clip(order.name, 40), clip(order.city, 30)].filter(Boolean).join(", ");
  const pay = order.payment === "cod" ? "Cash on delivery" : "";
  return {
    title: `New order ${order.orderId}`,
    body: [`Rs ${Math.round(order.total).toLocaleString("en-US")} · ${items}`, [who, pay].filter(Boolean).join(" · ")]
      .filter(Boolean)
      .join("\n"),
    url: "/admin/orders?tab=new",
    tag: `order-${order.orderId}`,
  };
}
