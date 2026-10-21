import { createHash, createHmac, randomUUID } from "node:crypto";

import type { Order, OrderItem, OrderStatus } from "@/lib/types";

export const ORDER_SHEET_SYNC_SCHEMA_VERSION = 1 as const;

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type OrderSheetSyncItem = {
  submissionId: string;
  name: string;
  slug: string;
  variant: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderSheetSyncPayload = {
  schemaVersion: typeof ORDER_SHEET_SYNC_SCHEMA_VERSION;
  eventId: string;
  syncedAt: string;
  order: {
    id: string;
    createdAt: string;
    status: string;
    customer: {
      name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      postal: string;
      note: string;
    };
    payment: string;
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
    promoCode: string;
    trackingId: string;
    courier: string;
    source: "Website";
    items: OrderSheetSyncItem[];
  };
};

export type SignedOrderSheetSyncEnvelope = {
  timestamp: string;
  nonce: string;
  payloadBase64: string;
  signature: string;
};

function finiteMoney(value: number | undefined): number {
  return Number.isFinite(value) ? Math.round(Number(value) * 100) / 100 : 0;
}

function positiveQuantity(value: number | undefined): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

function stableItemIdentity(item: OrderItem): string {
  return [
    item.variantSku?.trim(),
    item.sku?.trim(),
    item.slug?.trim(),
    item.variantKey?.trim(),
    item.variantName?.trim(),
    item.name?.trim(),
  ]
    .filter(Boolean)
    .join("|");
}

function buildItems(orderId: string, items: OrderItem[]): OrderSheetSyncItem[] {
  const keyed = items.map((item, originalIndex) => ({
    item,
    originalIndex,
    identity: stableItemIdentity(item) || `item-${originalIndex + 1}`,
  }));

  keyed.sort(
    (left, right) =>
      left.identity.localeCompare(right.identity) || left.originalIndex - right.originalIndex,
  );

  return keyed.map(({ item, identity }, index) => {
    const quantity = positiveQuantity(item.quantity);
    const unitPrice = finiteMoney(item.price);
    const digest = createHash("sha256")
      .update(`${orderId}\n${identity}\n${index}`)
      .digest("hex")
      .slice(0, 20);

    return {
      submissionId: `WEB-${orderId}-${digest}`.slice(0, 80),
      name: item.name?.trim() || item.slug?.trim() || "Website item",
      slug: item.slug?.trim() || "",
      variant: item.variantName?.trim() || item.variantKey?.trim() || "",
      sku: item.variantSku?.trim() || item.sku?.trim() || "",
      quantity,
      unitPrice,
      lineTotal: finiteMoney(item.lineTotal ?? quantity * unitPrice),
    };
  });
}

export function buildOrderSheetSyncPayload(
  order: Order,
  options?: { eventId?: string; syncedAt?: string },
): OrderSheetSyncPayload {
  if (order.isDemo) throw new Error("Demo orders must not be synchronized.");
  if (!order.orderId.trim()) throw new Error("Order ID is required for sheet synchronization.");
  if (!order.items?.length) throw new Error("At least one order item is required for sheet synchronization.");

  const status = order.status ?? "new";
  return {
    schemaVersion: ORDER_SHEET_SYNC_SCHEMA_VERSION,
    eventId: options?.eventId ?? randomUUID(),
    syncedAt: options?.syncedAt ?? new Date().toISOString(),
    order: {
      id: order.orderId.trim(),
      createdAt: order.createdAt,
      status: STATUS_LABELS[status],
      customer: {
        name: order.customer?.name?.trim() || "",
        email: order.customer?.email?.trim() || "",
        phone: order.customer?.phone?.trim() || "",
        address: order.customer?.address?.trim() || "",
        city: order.customer?.city?.trim() || "",
        postal: order.customer?.postal?.trim() || "",
        note: order.customer?.note?.trim() || "",
      },
      payment: order.payment?.trim() || "cod",
      subtotal: finiteMoney(order.subtotal),
      shipping: finiteMoney(order.shipping),
      discount: finiteMoney(order.discount),
      total: finiteMoney(order.total),
      promoCode: order.promoCode?.trim() || "",
      trackingId: order.postexTrackingNumber?.trim() || "",
      courier: order.postexTrackingNumber?.trim() ? "PostEx" : "",
      source: "Website",
      items: buildItems(order.orderId.trim(), order.items),
    },
  };
}

export function signOrderSheetSyncPayload(
  payload: OrderSheetSyncPayload,
  secret: string,
  options?: { timestamp?: number; nonce?: string },
): SignedOrderSheetSyncEnvelope {
  const normalizedSecret = secret.trim();
  if (normalizedSecret.length < 32) {
    throw new Error("GOOGLE_ORDER_SYNC_SECRET must contain at least 32 characters.");
  }

  const timestamp = String(options?.timestamp ?? Date.now());
  const nonce = options?.nonce ?? randomUUID();
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signedContent = `${timestamp}.${nonce}.${payloadBase64}`;
  const signature = createHmac("sha256", normalizedSecret)
    .update(signedContent)
    .digest("base64url");

  return { timestamp, nonce, payloadBase64, signature };
}

export function resolveOrderSheetSyncEndpoint(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "script.google.com" ||
    !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)
  ) {
    throw new Error("GOOGLE_ORDER_SYNC_URL must be a deployed Google Apps Script /exec URL.");
  }
  return url.toString();
}
