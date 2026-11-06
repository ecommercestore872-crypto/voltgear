import { checkoutClientIp } from "@/lib/checkout-guard";
import type { CheckoutPostPersistInput } from "@/lib/checkout-post-persist-contract";
import { attachOrderAttribution } from "@/lib/db/order-attribution";
import { processMetaPurchaseOutboxForOrder } from "@/lib/meta-purchase-outbox";
import { trackTikTokServerPurchase } from "@/lib/tiktok-events-api";
import { effectiveCheckoutTrackingConsent } from "@/lib/checkout-tracking-consent";

export async function runCheckoutTracking(
  input: CheckoutPostPersistInput,
): Promise<void> {
  // Practice orders stay inside the sandbox: no attribution row and no
  // third-party conversion events containing synthetic customer data.
  if (input.isDemo) return;
  const consent = effectiveCheckoutTrackingConsent(input);
  // Meta starts before attribution storage or TikTok; those cannot delay it.
  const metaDelivery = consent === "all"
    ? processMetaPurchaseOutboxForOrder(input.orderId).catch(() => {
      console.error("[meta-outbox] immediate delivery failed");
    })
    : Promise.resolve();

  let ttclid: string | null = null;
  try {
    const snapshot = consent === "all" ? await attachOrderAttribution(
      input.orderId,
      input.request,
      input.body,
    ) : null;
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
        consent,
        ttclid,
        ttp: input.request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("_ttp="))?.slice(5),
      });
  } catch {
    console.error("[tiktok-server] tracking failed");
  }
  await metaDelivery;
}
