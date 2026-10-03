import { notifyNewOrderEmails, orderEmailFailureNote } from "@/lib/email";
import { appendOrderNote, enqueueEmailEvent } from "@/lib/order-store";
import { fetchSiteSettings } from "@/lib/db/store";
import { attachOrderAttribution } from "@/lib/db/order-attribution";
import { incrementPromoUsage } from "@/lib/db/promo-store";
import { trackTikTokServerPurchase } from "@/lib/tiktok-events-api";
import { trackMetaServerPurchase } from "@/lib/meta-events-api";
import { checkoutClientIp } from "@/lib/checkout-guard";
import { GIFT_WRAP_FEE } from "@/lib/checkout-server";
import type { OrderItem } from "@/lib/types";

export type CheckoutPostPersistInput = {
  orderId: string;
  request: Request;
  body: Record<string, unknown>;
  consent: string | null | undefined;
  appliedPromo: string | null;
  gift: boolean;
  isDemo: boolean;
  lines: OrderItem[];
  subtotal: number;
  finalShipping: number;
  finalTotal: number;
  discount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postal?: string;
  };
};

export async function runCheckoutPostPersist(
  input: CheckoutPostPersistInput,
): Promise<void> {
  const {
    orderId,
    request,
    body,
    consent,
    appliedPromo,
    gift,
    isDemo,
    lines,
    subtotal,
    finalShipping,
    finalTotal,
    discount,
    customer,
  } = input;

  if (appliedPromo) {
    try {
      await incrementPromoUsage(appliedPromo);
    } catch {
      console.error("[checkout] promo usage increment failed");
    }
  }

  let sessionTtclid: string | null = null;
  try {
    const snapshot = await attachOrderAttribution(orderId, request, body);
    sessionTtclid = snapshot?.attrib_ttclid || null;
  } catch {
    console.error("[order-attribution]", "attach failed");
  }

  try {
    if (typeof trackTikTokServerPurchase === "function" && !isDemo) {
      await trackTikTokServerPurchase({
        orderId,
        total: finalTotal,
        email: customer.email,
        phone: customer.phone,
        ip: checkoutClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        url: request.headers.get("referer") || "https://buyntryy.com/checkout",
        lines,
        consent,
        ttclid: sessionTtclid,
      });
    }
  } catch (err) {
    console.error("[tiktok-server] root error", err);
  }

  try {
    if (!isDemo) {
      const cookies = request.headers.get("cookie") || "";
      const fbpMatch = cookies.match(/(?:^|;\s*)_fbp=([^;]+)/);
      const fbcMatch = cookies.match(/(?:^|;\s*)_fbc=([^;]+)/);

      await trackMetaServerPurchase({
        orderId,
        value: finalTotal,
        items: lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          price: line.price,
          quantity: line.quantity,
        })),
        email: customer.email,
        phone: customer.phone,
        fullName: customer.name,
        city: customer.city,
        postalCode: customer.postal,
        country: "pk",
        clientIp: checkoutClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        eventSourceUrl: request.headers.get("referer") || undefined,
        fbp: fbpMatch ? fbpMatch[1] : undefined,
        fbc: fbcMatch ? fbcMatch[1] : undefined,
      });
    }
  } catch (err) {
    console.error("[meta-server] root error", err);
  }

  const emailPayload = {
    orderId,
    name: customer.name ?? "there",
    items: lines.map((i) => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      ...(i.slug ? { slug: i.slug } : {}),
      ...(i.variantName ? { variantName: i.variantName } : {}),
    })),
    subtotal,
    shipping: finalShipping,
    discount,
    promoCode: appliedPromo,
    giftWrapFee: gift ? GIFT_WRAP_FEE : 0,
    total: finalTotal,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    postal: customer.postal,
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
      customer.email,
      {
        ...emailPayload,
        email: customer.email,
      },
      { settingsEmail: settings?.email },
    );
  } catch (err) {
    emailThrew = true;
    console.error("[checkout] email send threw:", err);
  }

  const emailNote = emailThrew
    ? "Email send issue: exception during send."
    : orderEmailFailureNote(emailResult);
  if (emailNote) {
    try {
      await appendOrderNote(orderId, emailNote);
    } catch {
      console.error("[checkout] email failure note");
    }
  }

  try {
    await enqueueEmailEvent(
      "post-purchase",
      customer.email,
      emailPayload,
      5 * 24 * 60 * 60 * 1000,
    );
  } catch (err) {
    console.error("[checkout] enqueue post-purchase email failed:", err);
  }
}
