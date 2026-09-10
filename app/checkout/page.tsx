"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronLeft,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  AlertTriangle,
  Gift,
  MapPin,
  Truck,
  RotateCcw,
  Headphones,
  Star,
  Package,
  Home,
  Mail,
  Calendar,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCart, cartLineKey } from "@/components/cart/cart-provider";
import { useDealQuote } from "@/components/deals/use-deal-quote";
import { saveLastOrder } from "@/lib/review-reminder";
import { cn, formatPrice } from "@/lib/utils";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import {
  identifyTikTokCustomer,
  isCheckoutPricingReadyForInitiateCheckout,
  trackTikTokInitiateCheckout,
  trackTikTokPurchase,
} from "@/lib/tiktok-browser-events";
import {
  checkoutValidationCategoryFromHttp,
  trackFirstParty,
  validationCategoryFromFieldName,
} from "@/lib/first-party-analytics";
import {
  GADGET_SESSION_KEY,
  product2Href,
  products2Href,
  readGadgetPreviewSession,
} from "@/lib/gadget-preview";
import { useSiteConfig } from "@/lib/use-site-config";
import type { PriceMismatch } from "@/lib/checkout-server";

// Replaced STEPS structure with 4 linear mock-steps matching Figma design.
const STEPS = [
  { label: "Cart" },
  { label: "Information" },
  { label: "Review" },
  { label: "Complete" },
] as const;

const SUMMARY_CARD =
  "min-w-0 overflow-hidden rounded-xl border border-[var(--g-line)] bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5";

function SummaryPriceRow({
  label,
  value,
  tone = "muted",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "muted" | "deal" | "strong";
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 text-[13px] leading-snug">
      <span
        className={cn(
          "min-w-0 break-words",
          tone === "deal" && "font-semibold text-[var(--g-sage)]",
          tone === "muted" && "text-muted-foreground",
          tone === "strong" && "font-semibold text-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 text-right tabular-nums",
          tone === "deal" && "font-semibold text-[var(--g-sage)]",
          tone === "muted" && "font-semibold text-foreground",
          tone === "strong" && "font-bold text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

type PaymentMethod = "cod";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Banknote;
  available: boolean;
  badge?: string;
}[] = [
  {
    id: "cod",
    label: "Cash on Delivery (COD)",
    description: "Pay with cash when your order is delivered",
    icon: Banknote,
    available: true,
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    subtotal,
    updateQuantity,
    updateItemPrice,
    removeItem,
    clearCart,
  } = useCart();
  const dealQuote = useDealQuote(items);
  const dealDiscount = dealQuote.discount;
  const merchandise = Math.max(0, subtotal - dealDiscount);
  const config = useSiteConfig();
  const [gadget, setGadget] = useState(false);
  const shopHref = gadget ? products2Href() : "/products";
  const productHref = (slug: string) =>
    gadget ? product2Href(slug) : `/product/${slug}`;

  useEffect(() => {
    try {
      const fromGadget =
        new URLSearchParams(window.location.search).get("from") === "gadget";
      if (fromGadget) sessionStorage.setItem(GADGET_SESSION_KEY, "1");
      setGadget(fromGadget || readGadgetPreviewSession());
    } catch {
      setGadget(false);
    }

    try {
      // Background City Autofill from Edge Cookie
      const match = document.cookie.match(/(?:^|;\s*)visitor-city=([^;]*)/);
      if (match && match[1]) {
        const decodedCity = decodeURIComponent(match[1]);
        if (decodedCity && decodedCity !== "Pakistan") {
          setTimeout(() => {
            const cityEl = document.getElementById("city") as HTMLInputElement;
            if (cityEl && !cityEl.value) cityEl.value = decodedCity;
          }, 50);
        }
      }
    } catch {}
  }, []);

  // step: 0 = Cart, 1 = Information, 2 = Review, 3 = Complete (implicit on placedOrder)
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [orderNotes, setOrderNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<string | null>(null);
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);
  const [placedItems, setPlacedItems] = useState<typeof items>([]);
  const [customer, setCustomer] = useState<Record<string, string>>({});
  const [giftWrap, setGiftWrap] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [activePromo, setActivePromo] = useState<{
    code: string;
    discount: number;
    shipping: number;
    error?: string;
    loading?: boolean;
  } | null>(null);
  const [priceChanged, setPriceChanged] = useState<{
    items: PriceMismatch[];
    subtotal: number;
    shipping: number;
    total: number;
  } | null>(null);
  const idempotencyKeyRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `co-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const GIFT_WRAP_FEE = 199;

  const hasFreeShippingItem = items.some((item) => item.freeShipping);
  const baseShipping =
    merchandise === 0 || merchandise >= config.freeShippingThreshold || hasFreeShippingItem
      ? 0
      : config.shippingFee;
  const promoStacks = !(dealDiscount > 0);
  const shipping =
    promoStacks && activePromo && !activePromo.error
      ? activePromo.shipping
      : baseShipping;
  const appliedDiscount =
    promoStacks && activePromo && !activePromo.error ? activePromo.discount : 0;
  const subDiscount =
    promoStacks &&
    activePromo &&
    !activePromo.error &&
    activePromo.shipping === baseShipping
      ? appliedDiscount
      : 0;

  const total =
    merchandise + shipping + (giftWrap ? GIFT_WRAP_FEE : 0) - subDiscount;
  const hasPromo = promoStacks && !!activePromo && !activePromo.error;

  // Advance Payment Risk Mitigation
  const requiresAdvance = config.maxCodAmount && total > config.maxCodAmount;

  async function handleApplyPromo() {
    if (!promoInput.trim()) {
      setActivePromo(null);
      return;
    }
    setActivePromo({
      code: promoInput.trim(),
      discount: 0,
      shipping: baseShipping,
      loading: true,
    });

    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput.trim(),
          subtotal: merchandise,
          shipping: baseShipping,
          email: customer.email?.trim().toLowerCase() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActivePromo({
          code: promoInput.trim(),
          discount: 0,
          shipping: baseShipping,
          error: data.error || "Invalid promo code",
        });
      } else if (
        dealDiscount > 0 &&
        (data.type === "percent" || data.type === "fixed")
      ) {
        setActivePromo({
          code: promoInput.trim(),
          discount: 0,
          shipping: baseShipping,
          error:
            "A pair deal is already applied. Percent and rupee codes cannot stack.",
        });
      } else {
        setActivePromo({
          code: data.code,
          discount: data.discount,
          shipping: data.shipping,
        });
        setPromoInput("");
      }
    } catch {
      setActivePromo({
        code: promoInput.trim(),
        discount: 0,
        shipping: baseShipping,
        error: "Network error",
      });
    }
  }

  const shippingLabel = useMemo(() => {
    if (merchandise === 0) return null;
    if (shipping === 0) return "Free";
    const remaining = config.freeShippingThreshold - merchandise;
    return remaining > 0
      ? `${formatPrice(shipping)} (add ${formatPrice(remaining)} more for free shipping)`
      : formatPrice(shipping);
  }, [merchandise, shipping, config.freeShippingThreshold]);

  async function placeOrder(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    if (placing || placedOrder) return;
    setPlacing(true);
    setPriceChanged(null);

    // If order notes provided, we could technically pass it to API,
    // but preserving standard contract here:
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            ...(i.sku ? { sku: i.sku } : {}),
            ...(i.variantKey ? { variantKey: i.variantKey } : {}),
            ...(i.variantName ? { variantName: i.variantName } : {}),
            ...(i.variantSku ? { variantSku: i.variantSku } : {}),
          })),
          customer: {
            ...customer,
            note: orderNotes.trim() || undefined,
          }, // contains name, email, phone, etc, plus order notes
          payment: { method: payment },
          subtotal,
          shipping,
          total, // actual final total including pseudo promos could break backend signature check in real app if api doesn't support promo, but keeping identical
          giftWrap,
          giftWrapFee: giftWrap ? GIFT_WRAP_FEE : 0,
          idempotencyKey: idempotencyKeyRef.current,
          ...(activePromo?.code && !activePromo.error
            ? { promoCode: activePromo.code }
            : {}),
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.code === "PRICE_CHANGED") {
        trackFirstParty({
          name: "checkout_validation_error",
          path: "/checkout",
          page_type: "checkout",
          properties: { category: "price_changed" },
        });
        for (const line of data.lines ?? []) {
          updateItemPrice(
            line.variantKey ? `${line.slug}::${line.variantKey}` : line.slug,
            line.price,
          );
        }
        setPriceChanged({
          items: data.items ?? [],
          subtotal: Number(data.subtotal) || 0,
          shipping: Number(data.shipping) || 0,
          total: Number(data.total) || 0,
        });
        return;
      }

      if (!res.ok) {
        const category = checkoutValidationCategoryFromHttp(
          res.status,
          typeof data.error === "string" ? data.error : undefined,
        );
        if (category) {
          trackFirstParty({
            name: "checkout_validation_error",
            path: "/checkout",
            page_type: "checkout",
            properties: { category },
          });
        }
        throw new Error(data.error ?? "Failed");
      }
      setPlacedOrder(data.orderId);
      // Wait for navigation
      const checkoutEmail = customer.email?.trim().toLowerCase() ?? "";
      const orderQs = checkoutEmail
        ? `?email=${encodeURIComponent(checkoutEmail)}`
        : "";
      const serverTotal = Number(data.total);
      const purchaseTotal = Number.isFinite(serverTotal) ? serverTotal : total;
      const serverLines = Array.isArray(data.lines) ? data.lines : [];
      void identifyTikTokCustomer({
        email: customer.email,
        phone: customer.phone,
      });
      try {
        trackTikTokPurchase({
          orderId: data.orderId,
          total: purchaseTotal,
          lines: serverLines,
        });
      } catch {
        // fail-open
      }
      // Scroll to top BEFORE navigation so Next.js doesn't restore checkout's scroll position
      window.scrollTo({ top: 0, behavior: "instant" });
      router.push(`/order/${data.orderId}${orderQs}`);
      trackPurchase(data.orderId, analyticsItems(), total);
      clearCart();
      const first = items[0];
      if (first) {
        saveLastOrder({
          at: Date.now(),
          orderId: data.orderId,
          email: checkoutEmail,
          name: customer.name?.trim() ?? "",
          product: { slug: first.slug, name: first.name },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong placing your order. Please try again.";
      alert(message);
    } finally {
      setPlacing(false);
    }
  }

  function analyticsItems() {
    return items.map((i) => ({
      item_id: i.slug,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity,
    }));
  }

  function notifyAbandonedCart() {
    if (placedOrder || step < 1) return;
    const emailEl = document.querySelector("#email") as HTMLInputElement | null;
    const email = emailEl?.value || customer.email;
    if (!email) return;
    const nameEl = document.querySelector("#name") as HTMLInputElement | null;
    const data = {
      email,
      name: nameEl?.value || customer.name,
      items: items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotal,
    };
    navigator.sendBeacon("/api/abandoned-cart", JSON.stringify(data));
  }

  const onLeave = () => notifyAbandonedCart();

  function nextStep(next: number) {
    if (next === 2 && step === 1) {
      trackBeginCheckout(analyticsItems(), total);
    }
    setStep(next);
  }

  useEffect(() => {
    if (priceChanged) setPriceChanged(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, step, giftWrap]);

  useEffect(() => {
    trackFirstParty({
      name: "checkout_started",
      path: "/checkout",
      page_type: "checkout",
    });
  }, []);

  useEffect(() => {
    if (
      !isCheckoutPricingReadyForInitiateCheckout({
        hasItems: items.length > 0,
        dealQuoteReady: dealQuote.ready,
        promoLoading: Boolean(activePromo?.loading),
      })
    ) {
      return;
    }
    try {
      trackTikTokInitiateCheckout(
        items.map((i) => ({
          slug: i.slug,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          ...(i.sku ? { sku: i.sku } : {}),
          ...(i.variantSku ? { variantSku: i.variantSku } : {}),
          ...(i.variantKey ? { variantKey: i.variantKey } : {}),
        })),
        total,
        {
          dealQuoteReady: dealQuote.ready,
          promoLoading: Boolean(activePromo?.loading),
        },
      );
    } catch {
      // fail-open
    }
  }, [items, total, dealQuote.ready, activePromo?.loading]);

  useEffect(() => {
    if (step === 1) {
      trackFirstParty({
        name: "checkout_step",
        path: "/checkout",
        page_type: "checkout",
        properties: { step: "details" },
      });
    } else if (step === 2) {
      trackFirstParty({
        name: "checkout_step",
        path: "/checkout",
        page_type: "checkout",
        properties: { step: "confirm" },
      });
    }
  }, [step]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, items, placedOrder, subtotal]);

  /* ── Success screen ─────────────────────────────────────────────── */
  if (placedOrder) {
    return (
      <div className="min-h-screen bg-[var(--g-cream)] pt-16 flex flex-col items-center justify-start text-[var(--g-charcoal)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--g-forest)] mb-4" />
        <p className="text-sm font-semibold animate-pulse">
          Taking you to your order...
        </p>
      </div>
    );
  }

  /* ── Empty cart ─────────────────────────────────────────────────── */
  if (items.length === 0 && step === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 lg:px-8">
        <div className="rounded-2xl border border-dashed p-6 text-center sm:p-12">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Your cart is empty
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add some products and come back to check out.
          </p>
          <Button asChild className="mt-6">
            <Link href={shopHref}>Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--g-cream)] font-sans">
      <div className="border-b border-[var(--g-line)] bg-[var(--g-cream)] py-6 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)] mb-2">
            Checkout
          </p>
          <h1 className="gadget-display text-2xl tracking-tight text-[var(--g-charcoal)] sm:text-3xl lg:text-4xl">
            Complete your order
          </h1>
        </div>
      </div>

      {/* ── Mobile Sticky Total Bar (steps 1 & 2 only — lg hidden because right column is always visible) ── */}
      {step > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--g-line)] bg-[var(--g-cream)]/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g-sage)]">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
              <p className="text-lg font-bold tabular-nums text-[var(--g-charcoal)]">
                {formatPrice(total)}
              </p>
            </div>
            {shipping === 0 && merchandise > 0 ? (
              <span className="rounded-full bg-[var(--g-forest)]/10 px-3 py-1 text-[11px] font-bold text-[var(--g-forest)]">
                Free shipping
              </span>
            ) : shipping > 0 ? (
              <span className="text-[12px] text-[var(--g-taupe)]">
                +{formatPrice(shipping)} shipping
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="relative z-20 mx-auto max-w-6xl px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:py-8 sm:pb-16 lg:pb-16 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:gap-8">
          {/* ── Left Content Column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {step === 0 && (
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold tracking-tight">
                    Your Cart
                  </h2>
                  <Link
                    href="/products"
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Continue Shopping
                  </Link>
                </div>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li key={cartLineKey(item)} className="p-4 sm:p-6">
                        <div className="flex gap-3 sm:gap-6">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={96}
                              height={96}
                              className="h-20 w-20 shrink-0 rounded-lg border bg-muted object-cover sm:h-24 sm:w-24"
                            />
                          ) : (
                            <div className="h-20 w-20 shrink-0 rounded-lg border bg-muted sm:h-24 sm:w-24" />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col pb-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Link
                                  href={`/product/${item.slug}`}
                                  className="text-base font-bold text-foreground leading-snug hover:text-primary transition-colors"
                                >
                                  {item.name}
                                </Link>
                                {item.variantName && (
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {item.variantName}
                                  </p>
                                )}
                              </div>
                              <p className="font-bold text-foreground">
                                {formatPrice(item.price)}
                              </p>
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center gap-2 rounded-lg border border-border/80 px-2 py-1 bg-white">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      cartLineKey(item),
                                      item.quantity - 1,
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                  className="p-1 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-primary rounded"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span
                                  className="w-8 text-center text-sm font-bold text-foreground"
                                  aria-live="polite"
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      cartLineKey(item),
                                      item.quantity + 1,
                                    )
                                  }
                                  aria-label="Increase quantity"
                                  className="p-1 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-primary rounded"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(cartLineKey(item))}
                                aria-label={`Remove ${item.name}`}
                                className="text-sm font-semibold text-destructive hover:underline focus:ring-2 focus:ring-destructive rounded px-1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-8"
                    onClick={() => nextStep(1)}
                  >
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}

            {step === 1 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    Delivery Details
                  </h2>
                </div>
                <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
                  <form
                    id="details-form"
                    className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6"
                    onInvalidCapture={(e) => {
                      const target = e.target;
                      if (
                        !(target instanceof HTMLInputElement) &&
                        !(target instanceof HTMLSelectElement) &&
                        !(target instanceof HTMLTextAreaElement)
                      )
                        return;
                      trackFirstParty({
                        name: "checkout_validation_error",
                        path: "/checkout",
                        page_type: "checkout",
                        properties: {
                          category: validationCategoryFromFieldName(
                            target.name,
                          ),
                        },
                      });
                    }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      setCustomer(
                        Object.fromEntries(
                          new FormData(e.currentTarget),
                        ) as Record<string, string>,
                      );
                      nextStep(2); // Move directly to Review step
                    }}
                  >
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="name" className="text-sm font-bold">
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        autoComplete="name"
                        placeholder="John Doe"
                        defaultValue={customer.name}
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        defaultValue={customer.email}
                      />
                    </div>
                    <div className="min-w-0 space-y-2 sm:col-span-2">
                      <Label htmlFor="phone" className="text-sm font-bold">
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="+92 300 1234567"
                        defaultValue={customer.phone}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^\d+]/g, "");
                          if (val.startsWith("03")) val = "+92" + val.slice(1);
                          else if (val.startsWith("3")) val = "+92" + val;

                          if (val.startsWith("+92")) {
                            const local = val.slice(3).replace(/\D/g, "");
                            if (local.length > 3) {
                              val = `+92 ${local.slice(0, 3)} ${local.slice(3, 10)}`;
                            } else if (local.length > 0) {
                              val = `+92 ${local}`;
                            }
                          }
                          e.target.value = val;
                        }}
                      />
                    </div>
                    <div className="min-w-0 space-y-2 sm:col-span-2">
                      <Label htmlFor="address" className="text-sm font-bold">
                        Street Address *
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        required
                        autoComplete="street-address"
                        placeholder="House / Building / Street details"
                        defaultValue={customer.address}
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="city" className="text-sm font-bold">
                        City *
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        required
                        autoComplete="address-level2"
                        defaultValue={customer.city}
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="postal" className="text-sm font-bold">
                        Postal Code
                      </Label>
                      <Input
                        id="postal"
                        name="postal"
                        autoComplete="postal-code"
                        placeholder="Zip/Postal (Optional)"
                        defaultValue={customer.postal}
                      />
                    </div>
                  </form>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full sm:w-auto"
                    onClick={() => setStep(0)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Cart
                  </Button>
                  <Button
                    size="lg"
                    form="details-form"
                    type="submit"
                    className="h-12 w-full px-6 sm:w-auto sm:px-8"
                  >
                    Continue to Review <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="flex flex-col gap-6">
                {/* 1. Shipping Information Card */}
                <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <h3 className="font-bold text-foreground text-[15px]">
                      Shipping Information
                    </h3>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 break-words text-sm text-foreground/80 space-y-1">
                      <p className="font-bold text-foreground">
                        {customer.name || "N/A"}
                      </p>
                      <p>{customer.phone}</p>
                      <p>{customer.email}</p>
                      <div className="mt-3">
                        <p>{customer.address}</p>
                        <p>
                          {customer.city}
                          {customer.postal ? `, ${customer.postal}` : ""}
                        </p>
                        <p>Pakistan</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                {/* 2. Shipping Method Card */}
                <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <h3 className="font-bold text-foreground text-[15px]">
                      Shipping Method
                    </h3>
                    <button className="text-xs font-bold text-primary hover:underline">
                      Edit
                    </button>
                  </div>
                  <label className="flex cursor-default items-start gap-3 rounded-lg border border-primary bg-primary/5 p-3 sm:items-center sm:gap-4 sm:p-4">
                    <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:mt-0">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground">
                        Standard Delivery (2-4 Working Days)
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Free on orders over PKR{" "}
                        {config.freeShippingThreshold.toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold text-foreground">
                      {shippingLabel || "PKR 0"}
                    </span>
                  </label>
                </div>

                {/* 3. Payment Method Card */}
                <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <h3 className="font-bold text-foreground text-[15px]">
                      Payment Method
                    </h3>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>

                  {requiresAdvance && (
                    <div className="mb-5 rounded-lg bg-[var(--g-danger,#b42318)]/10 p-4 border border-[var(--g-danger,#b42318)]/20 shadow-sm animate-in fade-in zoom-in-95">
                      <p className="text-[14px] font-bold text-[var(--g-danger,#b42318)] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        Advance Payment Mandatory
                      </p>
                      <p className="text-[13px] text-[var(--g-danger,#b42318)]/80 mt-1.5 leading-snug">
                        Orders exceeding{" "}
                        <strong>
                          PKR {config.maxCodAmount!.toLocaleString()}
                        </strong>{" "}
                        require a partial or full advance deposit to process.
                        Our team will verify and securely collect this via Bank
                        Transfer / EasyPaisa after you place the order.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const selected = payment === method.id;
                      return (
                        <label
                          key={method.id}
                          className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "bg-white hover:bg-secondary/50"}`}
                        >
                          <div
                            className={`shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 ${selected ? "border-primary bg-primary text-white" : "border-border"}`}
                          >
                            {selected && (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            )}
                          </div>
                          <method.icon
                            className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <div className="flex-1">
                            <p className="text-[13px] font-bold tracking-wide">
                              {method.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                              {method.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Order Notes (Optional) */}
                <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <h3 className="font-bold text-foreground text-[15px]">
                      Order Notes (Optional)
                    </h3>
                  </div>
                  <input
                    type="text"
                    placeholder="Leave a note for your order (e.g. gate code, special instructions)"
                    className="w-full min-w-0 rounded-md border border-border px-3 py-3 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:px-4 sm:text-sm"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>

                {/* 5. Items in Your Order View */}
                <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-2 border-b pb-4 mb-4">
                    <h3 className="font-bold text-foreground text-[15px]">
                      Items in Your Order ({items.length})
                    </h3>
                    <button
                      onClick={() => setStep(0)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Edit Cart
                    </button>
                  </div>
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li
                        key={cartLineKey(item)}
                        className="py-4 flex gap-4 first:pt-0 last:pb-0"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 shrink-0 rounded-lg border bg-muted object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-lg border bg-muted" />
                        )}
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-[13px] font-bold text-foreground line-clamp-2">
                              {item.name}
                            </p>
                            <span className="text-[13px] font-bold shrink-0">
                              {formatPrice(item.price)}
                            </span>
                          </div>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.variantName}
                            </p>
                          )}
                          <div className="mt-auto flex gap-4 text-xs font-medium text-muted-foreground items-center">
                            {item.price > 0 && (
                              <span className="text-primary font-bold">
                                {formatPrice(item.price)}
                              </span>
                            )}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Security Tag Card */}
                <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-[#F4F9F8] p-5 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-white border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-foreground">
                      Safe & Secure Checkout
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your information is protected with 256-bit SSL encryption.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── Order summary sidebar ────────────────────────────────────────── */}
          <aside className="w-full space-y-4 lg:sticky lg:top-8 lg:self-start sm:space-y-5">
            <div className={SUMMARY_CARD}>
              <h2 className="mb-3 border-b border-[var(--g-line)] pb-3 text-base font-bold text-foreground sm:mb-4 sm:pb-4 sm:text-[17px]">
                Order Summary
              </h2>

              <div className="space-y-2.5 border-b border-[var(--g-line)] pb-3.5 sm:space-y-3 sm:pb-4">
                <SummaryPriceRow
                  label={`Subtotal (${items.reduce((acc, i) => acc + i.quantity, 0)} items)`}
                  value={formatPrice(subtotal)}
                />
                {dealDiscount > 0 ? (
                  <SummaryPriceRow
                    tone="deal"
                    label={
                      <>
                        Pair deal
                        {dealQuote.applied[0] ? (
                          <span className="font-medium">
                            {" "}
                            · {dealQuote.applied[0].title}
                          </span>
                        ) : null}
                      </>
                    }
                    value={`− ${formatPrice(dealDiscount)}`}
                  />
                ) : null}
                <SummaryPriceRow
                  label="Shipping"
                  value={shippingLabel ?? "—"}
                />
                {activePromo ? (
                  <SummaryPriceRow
                    tone="deal"
                    label="Promo discount"
                    value={`− ${formatPrice(appliedDiscount)}`}
                  />
                ) : null}
                {giftWrap ? (
                  <SummaryPriceRow
                    tone="strong"
                    label="Gift wrap"
                    value={formatPrice(GIFT_WRAP_FEE)}
                  />
                ) : null}
              </div>

              <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 sm:mt-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground sm:text-lg">
                    Total
                  </h3>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Inclusive of all taxes
                  </p>
                </div>
                <span className="shrink-0 text-right text-xl font-black tracking-tight text-primary tabular-nums sm:text-2xl">
                  {formatPrice(total)}
                </span>
              </div>

              {hasPromo && step === 2 ? (
                <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-primary/20 bg-[var(--g-cream)] p-3 text-xs font-bold text-primary sm:mt-4">
                  <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 leading-snug">
                    You will save {formatPrice(appliedDiscount)} on this order!
                  </span>
                </div>
              ) : null}
            </div>

            {step === 2 && (
              <div className={SUMMARY_CARD}>
                <h3 className="mb-3 text-[13px] font-bold text-foreground">
                  Have a promo code?
                </h3>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Input
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="h-11 min-w-0 flex-1"
                    disabled={activePromo?.loading}
                  />
                  <Button
                    variant="default"
                    onClick={handleApplyPromo}
                    disabled={activePromo?.loading || !promoInput.trim()}
                    className="h-11 w-full shrink-0 px-5 font-bold shadow-sm sm:w-auto"
                  >
                    {activePromo?.loading ? "Applying..." : "Apply"}
                  </Button>
                </div>
                {activePromo?.error ? (
                  <p className="mt-2 text-xs font-semibold text-destructive">
                    {activePromo.error}
                  </p>
                ) : null}
                {activePromo && !activePromo.error ? (
                  <div className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <span className="min-w-0 truncate text-xs font-bold text-primary">
                      Applied: {activePromo.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePromo(null)}
                      className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {priceChanged ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      Prices updated while processing.
                    </p>
                    <p className="mt-1 text-xs leading-snug">
                      Review the summary before placing your order again.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 && (
              <div className={SUMMARY_CARD}>
                <div className="mb-4 grid grid-cols-1 gap-3 border-b border-[var(--g-line)] pb-4 sm:mb-5 sm:grid-cols-2 sm:gap-3.5 sm:pb-5">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "1 Year Warranty",
                      detail: "On all products",
                    },
                    {
                      icon: RotateCcw,
                      title: "7 Days Easy Returns",
                      detail: "Hassle-free returns",
                    },
                    {
                      icon: Banknote,
                      title: "Cash on Delivery",
                      detail: "Pay when you receive",
                    },
                    {
                      icon: Lock,
                      title: "Secure Checkout",
                      detail: "100% safe & secure",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex min-w-0 items-start gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-cream)] text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => placeOrder()}
                  disabled={placing || Boolean(placedOrder)}
                  className="h-12 w-full gap-2 text-[15px] font-bold shadow-md"
                >
                  {placing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0" />
                  )}
                  {placing ? "Processing..." : "Place Order"}
                </Button>

                <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground sm:mt-4">
                  By placing your order, you agree to our{" "}
                  <Link
                    href="/terms-of-service"
                    className="font-bold text-primary underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    className="font-bold text-primary underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>


    </div>
  );
}
