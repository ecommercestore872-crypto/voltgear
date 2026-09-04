import { EMAIL_SEND_ISSUE_PREFIX } from "../email-rules";
import type {
  Order,
  OrderStatus,
  OrderStatusHistoryEntry,
} from "../types";

export { EMAIL_SEND_ISSUE_PREFIX };

export const ORDER_STATUS_VALUES: OrderStatus[] = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const SHOPPER_NOT_FOUND_MESSAGE =
  "We couldn't find an order for those details. Check the order number and email.";

export const SHOPPER_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SHOPPER_CANCEL_NOTE = "Cancelled by customer";

export function orderEmailIssueFromHistory(
  history: OrderStatusHistoryEntry[] | undefined
): string | null {
  const hit = [...(history ?? [])]
    .reverse()
    .find((entry) => (entry.note ?? "").startsWith(EMAIL_SEND_ISSUE_PREFIX));
  return hit?.note ?? null;
}

export type ShopperTrackPayload = {
  orderId: string;
  status: OrderStatus;
  statusUpdatedAt: string | null;
  statusHistory: { status: OrderStatus; note?: string; at?: string }[];
  createdAt: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    variantName?: string;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  payment: string;
  cancellable: boolean;
  cancelUntil: string | null;
};

export type AdminListRow = {
  orderId: string;
  createdAt: string;
  customerName: string;
  status: OrderStatus;
  total: number;
};

export type AdminOrderListItem = AdminListRow & {
  customerEmail: string;
  isDemo: boolean;
};

export function emailsMatch(a?: string | null, b?: string | null): boolean {
  return (a ?? "").toLowerCase().trim() === (b ?? "").toLowerCase().trim();
}

export function shopperLookupNotFound(
  order: Order | null,
  email: string
): boolean {
  if (!order) return true;
  return !emailsMatch(order.customer?.email, email);
}

export function canShopperCancel(order: Order, now: Date = new Date()): boolean {
  const status = order.status ?? "new";
  if (status !== "new" && status !== "processing") return false;
  const created = Date.parse(order.createdAt ?? "");
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created <= SHOPPER_CANCEL_WINDOW_MS;
}

export function shopperCancelUntil(order: Order): string | null {
  const status = order.status ?? "new";
  if (status !== "new" && status !== "processing") return null;
  const created = Date.parse(order.createdAt ?? "");
  if (!Number.isFinite(created)) return null;
  return new Date(created + SHOPPER_CANCEL_WINDOW_MS).toISOString();
}

export function shopperCancelBlockReason(
  order: Order,
  now: Date = new Date()
): string | null {
  if (canShopperCancel(order, now)) return null;
  const status = order.status ?? "new";
  if (status === "cancelled") {
    return "This order is already cancelled.";
  }
  if (status === "shipped" || status === "delivered") {
    return "This order can no longer be cancelled online. Contact us if you need help.";
  }
  return "The 24-hour cancel window has ended. Contact us if you need help.";
}

export function toShopperTrackPayload(order: Order): ShopperTrackPayload {
  return {
    orderId: order.orderId,
    status: order.status ?? "new",
    statusUpdatedAt: order.statusUpdatedAt ?? null,
    statusHistory: (order.statusHistory ?? []).map((h) => ({
      status: h.status,
      ...(h.note ? { note: h.note } : {}),
      ...(h.at ? { at: h.at } : {}),
    })),
    createdAt: order.createdAt,
    items: (order.items ?? []).map((i) => ({
      name: i.name ?? "",
      price: i.price ?? 0,
      quantity: i.quantity ?? 1,
      ...(i.variantName ? { variantName: i.variantName } : {}),
    })),
    subtotal: order.subtotal ?? 0,
    shipping: order.shipping ?? 0,
    total: order.total ?? 0,
    payment: order.payment ?? "cod",
    cancellable: canShopperCancel(order),
    cancelUntil: shopperCancelUntil(order),
  };
}

export function toAdminListRow(order: Order): AdminListRow {
  return {
    orderId: order.orderId,
    createdAt: order.createdAt,
    customerName: order.customer?.name ?? "",
    status: order.status ?? "new",
    total: order.total ?? 0,
  };
}

export function toAdminOrderListItem(order: Order): AdminOrderListItem {
  return {
    ...toAdminListRow(order),
    customerEmail: order.customer?.email ?? "",
    isDemo: Boolean(order.isDemo),
  };
}

export function isAllowedOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    ORDER_STATUS_VALUES.includes(value as OrderStatus)
  );
}

export function withStatusNote(
  status: OrderStatus,
  note?: string
): OrderStatusHistoryEntry {
  const trimmed = note?.trim();
  return {
    status,
    at: new Date().toISOString(),
    ...(trimmed ? { note: trimmed } : {}),
  };
}
