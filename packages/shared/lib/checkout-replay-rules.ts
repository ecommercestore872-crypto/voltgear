import type { CheckoutBody } from "@/lib/checkout-contract";
import type { NormalizedCheckoutCustomer } from "@/lib/checkout-customer-rules";
import type { Order } from "@/lib/types";

/** Check the shopper's original intent before returning an existing order. */
export function checkoutReplayMatches(
  order: Order,
  body: CheckoutBody,
  customer: NormalizedCheckoutCustomer,
): boolean {
  const saved = order.customer ?? {};
  const expectedNote = [body.giftWrap === true ? "Gift wrap requested." : null, customer.note ?? ""]
    .filter(Boolean)
    .join(" ");
  if (
    saved.name !== customer.name ||
    saved.email !== customer.email ||
    saved.phone !== customer.phone ||
    saved.address !== customer.address ||
    saved.province !== customer.province ||
    saved.city !== customer.city ||
    (saved.postal ?? "") !== (customer.postal ?? "") ||
    (saved.note ?? "") !== expectedNote ||
    (order.payment ?? "cod") !== (body.payment?.method ?? "cod") ||
    (order.promoCode ?? "").toUpperCase() !== (body.promoCode?.trim() ?? "").toUpperCase()
  ) return false;

  const requested = body.items ?? [];
  if ((order.items ?? []).length !== requested.length) return false;
  return (order.items ?? []).every((item, index) =>
    item.slug === requested[index]?.slug &&
    item.quantity === requested[index]?.quantity &&
    (item.variantKey ?? "") === (requested[index]?.variantKey ?? ""),
  );
}
