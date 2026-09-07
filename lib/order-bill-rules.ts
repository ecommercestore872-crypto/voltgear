import type { OrderStatus } from "./types";

export type OrderBillItem = {
  name: string;
  price: number;
  quantity: number;
  variantName?: string;
};

export type OrderBillTotals = {
  orderId: string;
  items: OrderBillItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  promoCode?: string | null;
  giftWrapFee?: number;
  total: number;
};

export type OrderBillLine = {
  key: string;
  label: string;
  amount: number;
  tone: "neutral" | "deal" | "strong";
  free?: boolean;
};

/** Prefer stored subtotal; otherwise sum line totals. */
export function resolveOrderSubtotal(input: {
  subtotal?: number | null;
  items?: { price?: number; quantity?: number }[] | null;
}): number {
  if (typeof input.subtotal === "number" && Number.isFinite(input.subtotal)) {
    return Math.max(0, input.subtotal);
  }
  const items = input.items ?? [];
  return items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0
  );
}

export function buildOrderBillLines(bill: OrderBillTotals): OrderBillLine[] {
  const lines: OrderBillLine[] = [
    {
      key: "subtotal",
      label: `Subtotal (${bill.items.reduce((n, i) => n + (i.quantity || 0), 0)} items)`,
      amount: resolveOrderSubtotal(bill),
      tone: "neutral",
    },
  ];
  const discount = Math.max(0, Number(bill.discount) || 0);
  if (discount > 0) {
    const code = (bill.promoCode ?? "").trim();
    lines.push({
      key: "discount",
      label: code ? `Discount (${code})` : "Discount",
      amount: -discount,
      tone: "deal",
    });
  }
  const gift = Math.max(0, Number(bill.giftWrapFee) || 0);
  if (gift > 0) {
    lines.push({
      key: "gift",
      label: "Gift wrap",
      amount: gift,
      tone: "neutral",
    });
  }
  const shipping = Math.max(0, Number(bill.shipping) || 0);
  lines.push({
    key: "shipping",
    label: "Shipping",
    amount: shipping,
    tone: "neutral",
    free: shipping === 0,
  });
  lines.push({
    key: "total",
    label: "Total due on delivery",
    amount: Math.max(0, Number(bill.total) || 0),
    tone: "strong",
  });
  return lines;
}

const PIPELINE: OrderStatus[] = ["new", "processing", "shipped", "delivered"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type OrderProgressStep = {
  key: OrderStatus;
  label: string;
  state: "complete" | "current" | "upcoming";
};

/** Drives the success-page tracker from the real order status (not a hard-coded first step). */
export function buildOrderProgressSteps(
  status: OrderStatus | null | undefined
): OrderProgressStep[] {
  const current = status && PIPELINE.includes(status) ? status : status === "cancelled" ? null : "new";
  if (status === "cancelled") {
    return [
      { key: "new", label: ORDER_STATUS_LABEL.new, state: "complete" },
      { key: "cancelled", label: ORDER_STATUS_LABEL.cancelled, state: "current" },
    ];
  }
  const idx = Math.max(0, PIPELINE.indexOf(current ?? "new"));
  return PIPELINE.map((key, i) => ({
    key,
    label: ORDER_STATUS_LABEL[key],
    state: (i < idx ? "complete" : i === idx ? "current" : "upcoming") as OrderProgressStep["state"],
  }));
}
