import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { createOrder, nextPublicOrderId } from "@/lib/order-store";
import { getOrderByPublicId } from "@/lib/db/store";
import {
  resolveCheckout,
  resolveShippingAndTotal,
  CHECKOUT_PRICE_CHANGED_ERROR,
  GIFT_WRAP_FEE,
} from "@/lib/checkout-server";
import { isDemoRequest } from "@/lib/demo";
import { orderIsDemo } from "@/lib/db/demo-rules";
import { applyPromoToTotals, normalizePromoCode } from "@/lib/db/promo-rules";
import { applyDealsToCart, promoBlockedByDeal } from "@/lib/db/deal-rules";
import { listProductDeals } from "@/lib/db/deal-store";
import { countPriorOrdersForEmail, getPromoByCode } from "@/lib/db/promo-store";
import { deferAfterResponse } from "@/lib/defer-after-response";
import { runCheckoutPostPersist } from "@/lib/checkout-post-persist";
import {
  checkoutClientIp,
  readIdempotencyKey,
  takeCheckoutRateLimit,
} from "@/lib/checkout-guard";
import {
  checkoutSloLog,
  type CheckoutOutcome,
} from "@/lib/checkout-observability";
import { checkoutHttpStatusAfterOrderPersisted } from "@/lib/email-checkout-rules";
import { normalizeCheckoutCustomer } from "@/lib/checkout-customer-rules";
import { stableCheckoutIntentString } from "@/lib/checkout-intent";

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
  idempotencyKey?: string;
  consent?: string | null;
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
  const checkoutStarted = performance.now();
  const slo = (
    outcome: CheckoutOutcome,
    status: number,
    extra?: {
      itemCount?: number;
      replayed?: boolean;
      code?: string;
      emailOutcome?: string;
    },
  ) => {
    checkoutSloLog({
      outcome,
      status,
      durationMs: performance.now() - checkoutStarted,
      ...extra,
    });
  };

  try {
    const body: CheckoutBody = await request.json();
    const { items = [], customer, payment, giftWrap, consent } = body;

    if (!items.length) {
      slo("validation", 400, { itemCount: 0 });
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 },
      );
    }
    const normalizedCustomer = normalizeCheckoutCustomer({
      ...customer,
      note: typeof customer?.note === "string" ? customer.note : undefined,
    });
    if (!normalizedCustomer.ok) {
      slo("validation", 400, { itemCount: items.length });
      return NextResponse.json(
        { error: normalizedCustomer.error },
        { status: 400 },
      );
    }
    const checkoutCustomer = normalizedCustomer.customer;
    const email = checkoutCustomer.email;
    const phone = checkoutCustomer.phone;
    const rate = takeCheckoutRateLimit({
      ip: checkoutClientIp(request),
      email,
    });
    if (!rate.ok) {
      slo("rate_limit", 429, { itemCount: items.length });
      return NextResponse.json({ error: rate.error }, { status: 429 });
    }

    const idemKey = readIdempotencyKey(request, body.idempotencyKey);
    if (payment?.method && payment.method !== "cod") {
      return NextResponse.json(
        { error: "Only Cash on Delivery is available right now." },
        { status: 400 },
      );
    }

    const demoSession = isDemoRequest(request);
    const [resolution, dealsList] = await Promise.all([
      resolveCheckout(items, giftWrap === true, demoSession),
      listProductDeals().catch(() => []),
    ]);

    // Stock / availability errors and invalid quantities are blocking 400s.
    // A price change is a 409: no order is created and no email is sent.
    if (resolution.ok === "price_changed") {
      slo("price_changed", 409, { itemCount: items.length, code: "PRICE_CHANGED" });
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
        { status: 409 },
      );
    }
    if (!resolution.ok) {
      slo("validation", 400, { itemCount: items.length });
      return NextResponse.json({ error: resolution.error }, { status: 400 });
    }

    const { lines, subtotal } = resolution.checkout;
    const gift = giftWrap === true;
    let dealDiscount = 0;
    try {
      dealDiscount = applyDealsToCart(
        lines.map((line) => ({
          slug: line.slug,
          quantity: line.quantity,
          price: line.price,
        })),
        dealsList,
      ).discount;
    } catch (error) {
      console.error("[checkout] deals", error);
      dealDiscount = 0;
    }
    const merchandise = Math.max(
      0,
      Math.round((subtotal - dealDiscount) * 100) / 100,
    );
    const shipped = await resolveShippingAndTotal(merchandise, gift);
    let finalShipping = shipped.shipping;
    let finalTotal = shipped.total;
    let discount = dealDiscount;
    let appliedPromo: string | null = null;

    const promoRaw = normalizePromoCode(body.promoCode);
    if (promoRaw) {
      try {
        const promo = await getPromoByCode(promoRaw);
        if (!promo) {
          return NextResponse.json(
            { error: "That promo code is not valid." },
            { status: 400 },
          );
        }
        if (promoBlockedByDeal(dealDiscount, promo.type)) {
          return NextResponse.json(
            {
              error:
                "A pair deal is already applied. Percent and rupee codes cannot stack on the same order.",
            },
            { status: 400 },
          );
        }
        const prior = await countPriorOrdersForEmail(email);
        const applied = applyPromoToTotals(promo, {
          subtotal: merchandise,
          shipping: finalShipping,
          giftWrapFee: gift ? GIFT_WRAP_FEE : 0,
          isFirstOrder: prior === 0,
        });
        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: 400 });
        }
        finalShipping = applied.shipping;
        finalTotal = applied.total;
        discount =
          Math.round(
            (dealDiscount +
              (promo.type === "free_shipping" ? 0 : applied.discount)) *
              100,
          ) / 100;
        appliedPromo = applied.code;
      } catch (error) {
        console.error("[checkout] promo", error);
        slo("promo_error", 503, { itemCount: items.length });
        return NextResponse.json(
          { error: "Could not apply promo code. Try again without it." },
          { status: 503 },
        );
      }
    }

    const customerNote = [
      gift ? "Gift wrap requested." : null,
      checkoutCustomer.note ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    const baseOrder = {
      customer: {
        name: checkoutCustomer.name,
        email,
        phone,
        address: checkoutCustomer.address,
        city: checkoutCustomer.city,
        postal: checkoutCustomer.postal,
        note: customerNote || undefined,
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

    let idempotencyFingerprint: string | undefined;
    if (idemKey) {
      const fgData = stableCheckoutIntentString({
        customer: {
          ...baseOrder.customer,
          postal: baseOrder.customer.postal ?? "",
        },
        items: baseOrder.items,
        paymentMethod: baseOrder.payment,
        giftWrap: gift,
        promoCode: baseOrder.promoCode,
        subtotal: baseOrder.subtotal,
        shipping: baseOrder.shipping,
        discount: baseOrder.discount,
        total: baseOrder.total,
        isDemo: baseOrder.isDemo,
      });
      idempotencyFingerprint = crypto.createHash("sha256").update(fgData).digest("hex");
    }

    let orderId = await nextPublicOrderId();
    let persisted: { orderId: string, replayed: boolean } | null = null;
    
    try {
      persisted = await createOrder({ ...baseOrder, orderId, idempotencyKey: idemKey, idempotencyFingerprint });
      for (let i = 0; i < 4 && !persisted; i++) {
        orderId = await nextPublicOrderId();
        persisted = await createOrder({ ...baseOrder, orderId, idempotencyKey: idemKey, idempotencyFingerprint });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("ATOMIC_BUSINESS_ERROR:")) {
        const businessMessage = message.split("ATOMIC_BUSINESS_ERROR:")[1].trim();
        if (businessMessage === "IDEMPOTENCY_CONFLICT") {
          return NextResponse.json(
            {
              code: "IDEMPOTENCY_CONFLICT",
              error: "This checkout attempt is already associated with different checkout details. Start a new checkout attempt to continue safely.",
            },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: businessMessage },
          { status: 400 }
        );
      }
      console.error("[checkout] root creation thrown:", err);
      slo("create_failed", 500, { itemCount: items.length });
      return NextResponse.json(
        { error: "We couldn't store your order. Please try again." },
        { status: 500 }
      );
    }

    if (!persisted) {
      slo("create_failed", 500, { itemCount: items.length });
      return NextResponse.json(
        { error: "We couldn't store your order. Please try again." },
        { status: 500 },
      );
    }
    
    orderId = persisted.orderId;

    if (persisted.replayed) {
      const existing = await getOrderByPublicId(orderId);
      slo("replayed", 200, { itemCount: items.length, replayed: true });
      return NextResponse.json({
        ok: true,
        orderId,
        replayed: true,
        ...(existing
          ? {
              subtotal: existing.subtotal,
              shipping: existing.shipping,
              total: existing.total,
              discount: existing.discount ?? 0,
              promoCode: existing.promoCode ?? null,
              lines: existing.items ?? [],
            }
          : {}),
      });
    }

    deferAfterResponse(() =>
      runCheckoutPostPersist({
        orderId,
        request,
        body: body as Record<string, unknown>,
        consent,
        appliedPromo,
        gift,
        isDemo: baseOrder.isDemo,
        lines,
        subtotal,
        finalShipping,
        finalTotal,
        discount,
        customer: {
          name: baseOrder.customer.name,
          email: baseOrder.customer.email,
          phone: baseOrder.customer.phone,
          address: baseOrder.customer.address,
          city: baseOrder.customer.city,
          postal: baseOrder.customer.postal,
        },
      }),
    );

    const status = checkoutHttpStatusAfterOrderPersisted(true);
    slo("success", status, { itemCount: lines.length, emailOutcome: "deferred" });
    return NextResponse.json({
      ok: true,
      orderId,
      lookupEmail: checkoutCustomer.email,
      subtotal,
      shipping: finalShipping,
      total: finalTotal,
      discount,
      promoCode: appliedPromo,
      lines,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    slo("server_error", 500);
    if (
      error instanceof Error &&
      error.message.includes("ATOMIC_BUSINESS_ERROR:")
    ) {
      const msg =
        error.message.split("ATOMIC_BUSINESS_ERROR:")[1]?.trim() ||
        "Inventory no longer available.";
      if (msg === "IDEMPOTENCY_CONFLICT") {
        slo("validation", 409);
        return NextResponse.json(
          {
            code: "IDEMPOTENCY_CONFLICT",
            error: "This checkout attempt is already associated with different checkout details. Start a new checkout attempt to continue safely.",
          },
          { status: 409 },
        );
      }
      slo("validation", 400);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    // For ATOMIC_INFRA_ERROR or any other unknown error, we return a generic 500 without leaking DB details
    return NextResponse.json(
      { error: "Something went wrong placing your order." },
      { status: 500 },
    );
  }
}
