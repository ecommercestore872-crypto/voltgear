import crypto from "node:crypto";

import type { OrderCustomer, OrderItem } from "@/lib/types";

export type CheckoutFingerprintInput = {
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
};

export function scopeCheckoutIdempotencyKey(
  key: string | null,
  isDemo: boolean,
): string | null {
  return key ? `${isDemo ? "demo" : "live"}:${key}` : null;
}

export function buildCheckoutIdempotencyFingerprint(
  order: CheckoutFingerprintInput,
): string {
  const payload = JSON.stringify({
    email: order.customer.email,
    phone: order.customer.phone,
    items: order.items.map((item) => ({
      s: item.slug,
      q: item.quantity,
      v: item.variantKey,
    })),
    total: order.total,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}
