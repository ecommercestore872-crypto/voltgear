import { NextResponse } from "next/server";

import { getOrderByPublicId } from "@/lib/db/store";
import {
  resolveCheckout,
  CHECKOUT_PRICE_CHANGED_ERROR,
} from "@/lib/checkout-server";
import { isDemoRequest } from "@/lib/demo";
import { orderIsDemo } from "@/lib/db/demo-rules";
import { listProductDeals } from "@/lib/db/deal-store";
import { deferAfterResponse } from "@/lib/defer-after-response";
import { runCheckoutPostPersist } from "@/lib/checkout-post-persist";
import type { CheckoutBody } from "@/lib/checkout-contract";
import { resolveCheckoutPricing } from "@/lib/checkout-pricing";
import { persistCheckoutOrder } from "@/lib/checkout-persistence";
import {
  cacheCheckoutOrder,
  checkoutClientIp,
  getCachedCheckoutOrder,
  readIdempotencyKey,
  takeCheckoutRateLimit,
} from "@/lib/checkout-guard";
import {
  checkoutSloLog,
  type CheckoutOutcome,
} from "@/lib/checkout-observability";
import { checkoutHttpStatusAfterOrderPersisted } from "@/lib/email-checkout-rules";
import { normalizeCheckoutCustomer } from "@/lib/checkout-customer-rules";
import { scopeCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const demoSession = isDemoRequest(request);
    const rawIdemKey = readIdempotencyKey(request, body.idempotencyKey);
    // Keep practice retries in a separate namespace so a browser switching
    // between demo and live checkout can never replay the other environment.
    const idemKey = scopeCheckoutIdempotencyKey(rawIdemKey, demoSession);
    if (idemKey) {
      const cached = getCachedCheckoutOrder(idemKey);
      if (cached) {
        const existing = await getOrderByPublicId(cached);
        if (existing) {
          slo("replayed", 200, { itemCount: items.length, replayed: true });
          return NextResponse.json({
            ok: true,
            orderId: cached,
            lookupEmail: existing.customer?.email ?? "",
            subtotal: existing.subtotal,
            shipping: existing.shipping,
            total: existing.total,
            discount: existing.discount ?? 0,
            promoCode: existing.promoCode ?? null,
            lines: existing.items ?? [],
            replayed: true,
          });
        }
      }
    }

    if (payment?.method && payment.method !== "cod") {
      return NextResponse.json(
        { error: "Only Cash on Delivery is available right now." },
        { status: 400 },
      );
    }

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
    const pricingResult = await resolveCheckoutPricing({
      lines,
      subtotal,
      gift,
      promoCode: body.promoCode,
      email,
      deals: dealsList,
    });
    if (!pricingResult.ok) {
      if (pricingResult.code === "promo_error") {
        slo("promo_error", pricingResult.status, { itemCount: items.length });
      }
      return NextResponse.json(
        { error: pricingResult.error },
        { status: pricingResult.status },
      );
    }
    const { finalShipping, finalTotal, discount, appliedPromo } =
      pricingResult.pricing;

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

    let persisted: { orderId: string; replayed: boolean } | null = null;
    try {
      persisted = await persistCheckoutOrder(baseOrder, idemKey);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("ATOMIC_BUSINESS_ERROR:")) {
        return NextResponse.json(
          { error: message.split("ATOMIC_BUSINESS_ERROR:")[1].trim() },
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
    
    const orderId = persisted.orderId;

    if (idemKey) {
      cacheCheckoutOrder(idemKey, orderId);
    }

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
