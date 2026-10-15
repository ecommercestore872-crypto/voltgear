import { buildCheckoutIdempotencyFingerprint } from "@/lib/checkout-idempotency";
import {
  createOrder,
  nextPublicOrderId,
  type NewOrderInput,
} from "@/lib/order-store";

type CheckoutOrderInput = Omit<
  NewOrderInput,
  "orderId" | "idempotencyKey" | "idempotencyFingerprint"
>;

export async function persistCheckoutOrder(
  order: CheckoutOrderInput,
  idempotencyKey?: string | null,
): Promise<{ orderId: string; replayed: boolean } | null> {
  const idempotencyFingerprint = idempotencyKey
    ? buildCheckoutIdempotencyFingerprint(order)
    : undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderId = await nextPublicOrderId();
    const persisted = await createOrder({
      ...order,
      orderId,
      idempotencyKey,
      idempotencyFingerprint,
    });
    if (persisted) return persisted;
  }
  return null;
}
