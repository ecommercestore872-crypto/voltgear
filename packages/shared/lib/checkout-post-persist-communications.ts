import type { CheckoutPostPersistInput } from "@/lib/checkout-post-persist-contract";
import { GIFT_WRAP_FEE } from "@/lib/checkout-server";
import { fetchSiteSettings } from "@/lib/db/store";
import { notifyNewOrderEmails, orderEmailFailureNote } from "@/lib/email";
import { appendOrderNote, enqueueEmailEvent } from "@/lib/order-store";
import { pakistanProvinceLabel } from "@/lib/pakistan-locations";

export async function runCheckoutCommunications(
  input: CheckoutPostPersistInput,
): Promise<void> {
  // Practice checkouts must never email real addresses or enqueue retention
  // campaigns containing their synthetic order/customer payloads.
  if (input.isDemo) return;

  const payload = {
    orderId: input.orderId,
    name: input.customer.name ?? "there",
    items: input.lines.map((item) => ({
      name: item.name ?? "Item",
      price: item.price ?? 0,
      quantity: item.quantity ?? 1,
      ...(item.slug ? { slug: item.slug } : {}),
      ...(item.variantName ? { variantName: item.variantName } : {}),
    })),
    subtotal: input.subtotal,
    shipping: input.finalShipping,
    discount: input.discount,
    promoCode: input.appliedPromo,
    giftWrapFee: input.gift ? GIFT_WRAP_FEE : 0,
    total: input.finalTotal,
    phone: input.customer.phone,
    address: input.customer.address,
    province: pakistanProvinceLabel(input.customer.province) ?? undefined,
    city: input.customer.city,
    postal: input.customer.postal,
  };

  const settings = await fetchSiteSettings().catch(() => null);
  let emailThrew = false;
  let emailResult = {
    customerSent: false,
    adminSent: false,
    adminTo: "",
  };
  try {
    emailResult = await notifyNewOrderEmails(
      input.customer.email,
      { ...payload, email: input.customer.email },
      { settingsEmail: settings?.email },
    );
  } catch (error) {
    emailThrew = true;
    console.error("[checkout] email send threw:", error);
  }

  const emailNote = emailThrew
    ? "Email send issue: exception during send."
    : orderEmailFailureNote(emailResult);
  if (emailNote) {
    try {
      await appendOrderNote(input.orderId, emailNote);
    } catch {
      console.error("[checkout] email failure note");
    }
  }

  try {
    await enqueueEmailEvent(
      "post-purchase",
      input.customer.email,
      payload,
      5 * 24 * 60 * 60 * 1000,
    );
  } catch (error) {
    console.error("[checkout] enqueue post-purchase email failed:", error);
  }
}
