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
  // Meta starts before attribution storage or TikTok; those cannot delay it.
  const metaDelivery = sendMetaPurchase(input);

  let ttclid: string | null = null;
  try {
    const snapshot = input.consent === "all" ? await attachOrderAttribution(
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
        consent: input.consent,
        ttclid,
        ttp: input.request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("_ttp="))?.slice(5),
      });
  } catch {
    console.error("[tiktok-server] tracking failed");
  }
  await metaDelivery;
}

async function sendMetaPurchase(input: CheckoutPostPersistInput): Promise<void> {
  try {
    const { fbp, fbc } = readMetaCookieIds(
      input.request.headers.get("cookie") || "",
    );
    await trackMetaServerPurchase({
      consent: input.request.headers.get("sec-gpc") === "1" || input.request.headers.get("dnt") === "1" ? "essential" : input.consent,
      eventTime: input.acceptedAt,
      orderId: input.orderId,
      value: input.finalTotal,
      items: input.lines.map((line) => ({
        productId: line.slug,
        name: line.name,
        price: line.price!,
        quantity: line.quantity!,
      })),
      email: input.customer.email,
      phone: input.customer.phone,
      clientIp: checkoutClientIp(input.request),
      userAgent: input.request.headers.get("user-agent") || undefined,
      eventSourceUrl: "https://buyntryy.com/checkout",
      fbp,
      fbc,
    });
  } catch {
    console.error("[meta-server] tracking failed");
  }
}
