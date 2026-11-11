import crypto from "node:crypto";

import type { OrderCustomer, OrderItem } from "@/lib/types";
import type { CheckoutBody } from "@/lib/checkout-contract";
import type { NormalizedCheckoutCustomer } from "@/lib/checkout-customer-rules";

export type CheckoutFingerprintInput = {
  customer: OrderCustomer;
  items: OrderItem[];
  payment?: string;
  subtotal?: number;
  shipping?: number;
  discount?: number;
  promoCode?: string | null;
  total: number;
};

function hash(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildCheckoutRequestFingerprint(
  body: CheckoutBody,
  customer: NormalizedCheckoutCustomer,
): string {
  return hash({
    customer,
    items: (body.items ?? []).map((item) => ({
      slug: item.slug,
      quantity: item.quantity,
      variantKey: item.variantKey ?? null,
      price: item.price,
    })),
    giftWrap: body.giftWrap === true,
    promoCode: body.promoCode?.trim().toUpperCase() ?? "",
    payment: body.payment?.method ?? "cod",
  });
}

export function scopeCheckoutIdempotencyKey(
  key: string | null,
  isDemo: boolean,
): string | null {
  return key ? `${isDemo ? "demo" : "live"}:${key}` : null;
}

export function buildCheckoutIdempotencyFingerprint(
  order: CheckoutFingerprintInput,
): string {
  return hash({
    customer: order.customer,
    items: order.items.map((item) => ({
      s: item.slug,
      q: item.quantity,
      v: item.variantKey,
      p: item.price,
    })),
    payment: order.payment,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount ?? 0,
    promoCode: order.promoCode ?? null,
    total: order.total,
  });
}
