import { buildCheckoutIdempotencyFingerprint } from "@/lib/checkout-idempotency";
import { effectiveCheckoutTrackingConsent } from "@/lib/checkout-tracking-consent";
import { readMetaCookieIds } from "@/lib/checkout-tracking-rules";
import { buildMetaServerPurchasePayload } from "@/lib/meta-events-api";
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
  tracking?: { request: Request; consent?: string | null },
): Promise<{ orderId: string; replayed: boolean } | null> {
  const idempotencyFingerprint = idempotencyKey
    ? buildCheckoutIdempotencyFingerprint(order)
    : undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderId = await nextPublicOrderId();
    const eligible = !order.isDemo && tracking && effectiveCheckoutTrackingConsent(tracking) === "all";
    const { fbp, fbc } = eligible ? readMetaCookieIds(tracking.request.headers.get("cookie") ?? "") : {};
    const metaPayload = eligible ? buildMetaServerPurchasePayload({
      orderId, value: order.total,
      items: order.items.map((line) => ({
        productId: line.slug, name: line.name,
        price: line.price!, quantity: line.quantity!,
      })),
      email: order.customer.email, phone: order.customer.phone,
      fbp, fbc,
    }) : null;
    const persisted = await createOrder({
      ...order,
      orderId,
      idempotencyKey,
      idempotencyFingerprint,
      metaPayload,
    });
    if (persisted) return persisted;
  }
  return null;
}
