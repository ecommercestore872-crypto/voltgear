import { checkoutClientIp } from "@/lib/checkout-guard";
import type { CheckoutPostPersistInput } from "@/lib/checkout-post-persist-contract";
import { readMetaCookieIds } from "@/lib/checkout-tracking-rules";
import { attachOrderAttribution } from "@/lib/db/order-attribution";
import { trackMetaServerPurchase } from "@/lib/meta-events-api";
import { trackTikTokServerPurchase } from "@/lib/tiktok-events-api";

export async function runCheckoutTracking(
  input: CheckoutPostPersistInput,
): Promise<void> {
  // Practice orders stay inside the sandbox: no attribution row and no
  // third-party conversion events containing synthetic customer data.
  if (input.isDemo) return;

  let ttclid: string | null = null;
  try {
    const snapshot = await attachOrderAttribution(
      input.orderId,
      input.request,
      input.body,
    );
    ttclid = snapshot?.attrib_ttclid || null;
  } catch {
    console.error("[order-attribution]", "attach failed");
  }

  try {
    await trackTikTokServerPurchase({
      orderId: input.orderId,
      total: input.finalTotal,
      email: input.customer.email,
      phone: input.customer.phone,
      ip: checkoutClientIp(input.request),
      userAgent: input.request.headers.get("user-agent") || undefined,
      url:
        input.request.headers.get("referer") ||
        "https://buyntryy.com/checkout",
      lines: input.lines,
      consent: input.consent,
      ttclid,
    });
  } catch (error) {
    console.error("[tiktok-server] root error", error);
  }

  try {
    const { fbp, fbc } = readMetaCookieIds(
      input.request.headers.get("cookie") || "",
    );
    await trackMetaServerPurchase({
      orderId: input.orderId,
      value: input.finalTotal,
      items: input.lines.map((line) => ({
        productId: line.slug ?? line.variantKey,
        name: line.name,
        price: line.price ?? 0,
        quantity: line.quantity ?? 1,
      })),
      email: input.customer.email,
      phone: input.customer.phone,
      fullName: input.customer.name,
      city: input.customer.city,
      postalCode: input.customer.postal,
      country: "pk",
      clientIp: checkoutClientIp(input.request),
      userAgent: input.request.headers.get("user-agent") || undefined,
      eventSourceUrl: input.request.headers.get("referer") || undefined,
      fbp,
      fbc,
    });
  } catch (error) {
    console.error("[meta-server] root error", error);
  }
}
