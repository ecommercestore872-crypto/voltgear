import { NextResponse } from "next/server";

import { sendOrderConfirmationEmail } from "@/lib/email";
import { createOrder, enqueueEmailEvent, nextPublicOrderId } from "@/lib/order-store";
import { resolveCheckout, CHECKOUT_PRICE_CHANGED_ERROR, GIFT_WRAP_FEE } from "@/lib/checkout-server";
import { isDemoRequest } from "@/lib/demo";
import { attachOrderAttribution } from "@/lib/db/analytics-checkout";
import { orderIsDemo } from "@/lib/db/demo-rules";
import { applyPromoToTotals, normalizePromoCode } from "@/lib/db/promo-rules";
import {
  countPriorOrdersForEmail,
  getPromoByCode,
  incrementPromoUsage,
} from "@/lib/db/promo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckoutCustomer {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
  note?: string;
}

interface CheckoutBody {
  items?: { slug?: string; quantity?: number; variantKey?: string }[];
  customer?: CheckoutCustomer;
  payment?: { method?: string };
  giftWrap?: boolean;
  promoCode?: string;
  // Present only for backwards-compatible clients; never trusted.
  subtotal?: number;
  shipping?: number;
  total?: number;
}

/**
 * Order endpoint. Cash on Delivery is the only supported payment method;
 * add a gateway by extending the `payment.method` switch — the checkout UI
 * and order persistence need no changes.
 *
 * The browser is never authoritative: every line is resolved against current
 * Sanity data (product ownership, selected variant, unit price, stock) and
 * subtotal / shipping / total are computed server-side. Client-supplied
 * prices and totals are ignored.
 *
 * On success the order is persisted and the customer's email is captured for
 * retention automations (order confirmation now, post-purchase / win-back
 * via the flow runner).
 */
export async function POST(request: Request) {
  try {
    const body: CheckoutBody = await request.json();
    const { items = [], customer, payment, giftWrap } = body;

    if (!items.length) {
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 }
      );
    }
    if (!customer?.name || !customer.email || !customer.phone || !customer.address) {
      return NextResponse.json(
        { error: "Name, email, phone and address are required." },
        { status: 400 }
      );
    }
    if (payment?.method && payment.method !== "cod") {
      return NextResponse.json(
        { error: "Only Cash on Delivery is available right now." },
        { status: 400 }
      );
    }

    const demoSession = isDemoRequest(request);
    const resolution = await resolveCheckout(items, giftWrap === true, demoSession);

    // Stock / availability errors and invalid quantities are blocking 400s.
    // A price change is a 409: no order is created and no email is sent.
    if (resolution.ok === "price_changed") {
      return NextResponse.json(
        {
          code: "PRICE_CHANGED" as const,
          error: CHECKOUT_PRICE_CHANGED_ERROR,
          items: resolution.items,
          lines: resolution.checkout.lines,
          subtotal: resolution.checkout.subtotal,
          shipping: resolution.checkout.shipping,
          total: resolution.checkout.total,
        },
        { status: 409 }
      );
    }
    if (!resolution.ok) {
      return NextResponse.json({ error: resolution.error }, { status: 400 });
    }

    const { lines, subtotal, shipping, total } = resolution.checkout;

    let finalShipping = shipping;
    let finalTotal = total;
    let discount = 0;
    let appliedPromo: string | null = null;

    const promoRaw = normalizePromoCode(body.promoCode);
    if (promoRaw) {
      try {
        const promo = await getPromoByCode(promoRaw);
        if (!promo) {
          return NextResponse.json(
            { error: "That promo code is not valid." },
            { status: 400 }
          );
        }
        const prior = await countPriorOrdersForEmail(customer.email);
        const applied = applyPromoToTotals(promo, {
          subtotal,
          shipping,
          giftWrapFee: giftWrap === true ? GIFT_WRAP_FEE : 0,
          isFirstOrder: prior === 0,
        });
        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: 400 });
        }
        finalShipping = applied.shipping;
        finalTotal = applied.total;
        discount = applied.discount;
        appliedPromo = applied.code;
      } catch (error) {
        console.error("[checkout] promo", error);
        return NextResponse.json(
          { error: "Could not apply promo code. Try again without it." },
          { status: 503 }
        );
      }
    }

    const baseOrder = {
      customer: {
        name: customer.name,
        email: customer.email.toLowerCase().trim(),
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postal: customer.postal,
        note: customer.note,
      },
      items: lines,
      payment: "cod" as const,
      subtotal,
      shipping: finalShipping,
      total: finalTotal,
      discount,
      promoCode: appliedPromo,
      isDemo: orderIsDemo(demoSession, false),
    };

    let orderId = await nextPublicOrderId();
    let persisted = await createOrder({ ...baseOrder, orderId });
    for (let i = 0; i < 4 && !persisted; i++) {
      orderId = await nextPublicOrderId();
      persisted = await createOrder({ ...baseOrder, orderId });
    }

    if (!persisted) {
      return NextResponse.json(
        { error: "We couldn't store your order. Please try again." },
        { status: 500 }
      );
    }

    if (appliedPromo) {
      try {
        await incrementPromoUsage(appliedPromo);
      } catch {
        console.error("[checkout] promo usage increment failed");
      }
    }

    try {
      await attachOrderAttribution(orderId, request);
    } catch {
      console.error("[analytics-checkout]", "attach failed");
    }

    const emailPayload = {
      orderId,
      name: baseOrder.customer.name ?? "there",
      items: lines.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        ...(i.slug ? { slug: i.slug } : {}),
        ...(i.variantName ? { variantName: i.variantName } : {}),
      })),
      total: baseOrder.total,
      phone: baseOrder.customer.phone,
      address: baseOrder.customer.address,
      city: baseOrder.customer.city,
      postal: baseOrder.customer.postal,
    };
    await sendOrderConfirmationEmail(baseOrder.customer.email, emailPayload);
    await enqueueEmailEvent(
      "post-purchase",
      baseOrder.customer.email,
      emailPayload,
      5 * 24 * 60 * 60 * 1000
    );

    return NextResponse.json({
      ok: true,
      orderId,
      subtotal,
      shipping: finalShipping,
      total: finalTotal,
      discount,
      promoCode: appliedPromo,
      lines,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof Error && error.message.includes("ATOMIC_BUSINESS_ERROR:")) {
      const msg = error.message.split("ATOMIC_BUSINESS_ERROR:")[1]?.trim() || "Inventory no longer available.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    // For ATOMIC_INFRA_ERROR or any other unknown error, we return a generic 500 without leaking DB details
    return NextResponse.json(
      { error: "Something went wrong placing your order." },
      { status: 500 }
    );
  }
}