"use client";

import Link from "next/link";
import { useMemo, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  ChevronLeft,
  Loader2,
  Lock,
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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCart, cartLineKey } from "@/components/cart/cart-provider";
import { useDealQuote } from "@/components/deals/use-deal-quote";
import { saveLastOrder } from "@/lib/review-reminder";
import { cn, formatPrice } from "@/lib/utils";
import { readStoredClickAttribution } from "@/lib/click-attribution";
import {
  identifyTikTokCustomer,
  isCheckoutPricingReadyForInitiateCheckout,
  trackTikTokInitiateCheckout,
  trackTikTokPurchase,
} from "@/lib/tiktok-browser-events";
import {
  GADGET_SESSION_KEY,
  product2Href,
  products2Href,
  readGadgetPreviewSession,
} from "@/lib/gadget-preview";
import { CheckoutCodAssist } from "@/components/checkout/checkout-cod-assist";
import { CheckoutMobileOrderBox } from "@/components/checkout/checkout-mobile-order-box";
import { CheckoutSummaryPriceRow } from "@/components/checkout/checkout-summary-price-row";
import { useCheckoutMobileDock } from "@/components/checkout/use-checkout-mobile-dock";
import { useSiteConfig } from "@/lib/use-site-config";
import type { PriceMismatch } from "@/lib/checkout-server";
import {
  tagCheckoutClarityEvent,
  tagCheckoutClarityStep,
} from "@/lib/checkout-clarity";
import { normalizePhone } from "@/lib/messaging";
import { trackMetaInitiateCheckout, trackMetaPurchase } from "@/lib/meta-pixel-events";

const SUMMARY_CARD =
  "min-w-0 overflow-hidden rounded-xl border border-[var(--g-line)] bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5";

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

export default function CheckoutPageClient() {
  const router = useRouter();
  const {
    items,
    subtotal,
    updateItemPrice,
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
  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [orderNotes, setOrderNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const orderNavigationRef = useRef(false);
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
  const [apiError, setApiError] = useState<string | null>(null);
  const idemRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const showMobileDock = useCheckoutMobileDock(
    step === 1 && items.length > 0,
  );

  if (typeof window !== "undefined" && items.length > 0) {
    const cartFingerprint = JSON.stringify(
      items.map((i) => ({ slug: i.slug, q: i.quantity, v: i.variantKey }))
    );
    
    if (!idemRef.current || idemRef.current.fingerprint !== cartFingerprint) {
      const storedStr = window.sessionStorage.getItem("buy_n_try_checkout_idem");
      let activeKey = "";

      if (storedStr) {
        try {
          const stored = JSON.parse(storedStr);
          if (stored.cartFingerprint === cartFingerprint) {
            activeKey = stored.key;
          }
        } catch {}
      }

      if (!activeKey) {
        activeKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `co-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        
        window.sessionStorage.setItem(
          "buy_n_try_checkout_idem",
          JSON.stringify({ key: activeKey, cartFingerprint, createdAt: Date.now() })
        );
      }
      idemRef.current = { fingerprint: cartFingerprint, key: activeKey };
    }
  }

  const GIFT_WRAP_FEE = 199;

  const hasFreeShippingItem = items.some((item) => item.freeShipping);
  const baseShipping =
    merchandise === 0 ||
    merchandise >= config.freeShippingThreshold ||
    hasFreeShippingItem
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

  async function placeOrder(eOrData?: React.FormEvent<HTMLFormElement> | { customer?: Record<string, string> }) {
    let currentCustomer = customer;
    
    // Check if it's an explicit data object
    if (eOrData && !('preventDefault' in eOrData) && eOrData.customer) {
      currentCustomer = eOrData.customer;
    }
    // Fallback for legacy direct invocations
    else if (eOrData && 'preventDefault' in eOrData) {
      eOrData.preventDefault();
      if (eOrData.target instanceof HTMLFormElement) {
        currentCustomer = Object.fromEntries(new FormData(eOrData.target)) as Record<string, string>;
        setCustomer(currentCustomer);
      }
    }

    if (placing || orderNavigationRef.current) return;
    tagCheckoutClarityEvent("place_order_click");
    setPlacing(true);
    setPriceChanged(null);
    setApiError(null);

    try {
      const activeIdemKey = idemRef.current?.key || "";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": activeIdemKey,
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
            ...currentCustomer,
            note: orderNotes.trim() || undefined,
          }, // contains name, email, phone, etc, plus order notes
          payment: { method: payment },
          subtotal,
          shipping,
          total, // actual final total including pseudo promos could break backend signature check in real app if api doesn't support promo, but keeping identical
          giftWrap,
          giftWrapFee: giftWrap ? GIFT_WRAP_FEE : 0,
          idempotencyKey: activeIdemKey,
          consent:
            typeof window !== "undefined"
              ? window.localStorage.getItem("bnt-cookie-consent")
              : null,
          ...(activePromo?.code && !activePromo.error
            ? { promoCode: activePromo.code }
            : {}),
          attribution: readStoredClickAttribution() ?? undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.code === "PRICE_CHANGED") {
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
        setPlacing(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Failed");
      }
      tagCheckoutClarityEvent("order_success");

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("buy_n_try_checkout_idem");
      }
      idemRef.current = null;

      const lookupEmail =
        typeof data.lookupEmail === "string" && data.lookupEmail.trim()
          ? data.lookupEmail.trim().toLowerCase()
          : currentCustomer.email?.trim().toLowerCase() ?? "";
      if (lookupEmail && typeof document !== "undefined") {
        const maxAge = 60 * 60 * 24;
        document.cookie = `bnt_order_${encodeURIComponent(data.orderId)}=${encodeURIComponent(lookupEmail)}; Path=/order/${encodeURIComponent(data.orderId)}; Max-Age=${maxAge}; SameSite=Lax`;
      }
      const orderQuery = new URLSearchParams();
      const phoneForTrack = currentCustomer.phone?.trim() ?? "";
      if (phoneForTrack) orderQuery.set("phone", phoneForTrack);
      else if (lookupEmail) orderQuery.set("email", lookupEmail);
      const orderQs = orderQuery.toString() ? `?${orderQuery.toString()}` : "";
      const serverTotal = Number(data.total);
      const purchaseTotal = Number.isFinite(serverTotal) ? serverTotal : total;
      const serverLines = Array.isArray(data.lines) ? data.lines : [];
      const first = items[0];
      if (first) {
        saveLastOrder({
          at: Date.now(),
          orderId: data.orderId,
          email: lookupEmail,
          name: currentCustomer.name?.trim() ?? "",
          product: { slug: first.slug, name: first.name },
        });
      }

      orderNavigationRef.current = true;
      window.scrollTo({ top: 0, behavior: "instant" });
      router.replace(`/order/${data.orderId}${orderQs}`);

      window.setTimeout(() => {
        clearCart();
        void identifyTikTokCustomer({
          email: lookupEmail || currentCustomer.email,
          phone: currentCustomer.phone,
        });
        if (!data.replayed) {
          try {
            trackTikTokPurchase({
              orderId: data.orderId,
              total: purchaseTotal,
              lines: serverLines,
            });
          } catch {
            // fail-open
          }
          try {
            trackMetaPurchase({
              orderId: data.orderId,
              items: items.map((i) => ({
                productId: i.productId,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
              })),
              value: purchaseTotal,
            });
          } catch {
            // fail-open
          }
        }
      }, 0);
      return;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong placing your order. Please try again.";
      setApiError(message);
      setPlacing(false);
    }
  }

  function notifyAbandonedCart() {
    if (orderNavigationRef.current || step < 1) return;
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

  useEffect(() => {
    tagCheckoutClarityStep(step);
  }, [step]);

  useEffect(() => {
    if (priceChanged) setPriceChanged(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, step, giftWrap]);

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

    let metaCleanup: (() => void) | void = undefined;
    try {
      const metaCheckoutValue = Math.max(0, merchandise - subDiscount);
      metaCleanup = trackMetaInitiateCheckout({
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        value: metaCheckoutValue,
      });
    } catch {
      // fail-open
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

    return () => {
      if (typeof metaCleanup === "function") {
        metaCleanup();
      }
    };
  }, [items, total, dealQuote.ready, activePromo?.loading, merchandise, subDiscount]);

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
  }, [step, items, subtotal]);

  /* ── Empty cart ─────────────────────────────────────────────────── */
  if (items.length === 0) {
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
    <div className="premium-royal-page-bg min-h-dvh overflow-x-clip font-sans">
      <div
        className={cn(
          "relative z-20 mx-auto max-w-6xl px-4 py-4 sm:py-6 lg:px-8 lg:pb-16",
          showMobileDock
            ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(8rem+env(safe-area-inset-bottom))]"
            : "pb-8",
        )}
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:gap-8">
          {/* ── Left Content Column ─────────────────────────────────────────── */}
          <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-none lg:gap-6">
            {step === 1 && (
              <section className="min-w-0">
                <div className="premium-royal-enter premium-royal-enter-delay-1 mb-3">
                  <h2 className="gadget-display text-lg font-bold tracking-tight text-[var(--g-charcoal)] sm:text-xl">
                    Your delivery details
                  </h2>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">
                    Only 3 required fields — name, mobile number, and address.
                  </p>
                </div>

                {apiError && (
                  <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold">Couldn't place order</p>
                        <p className="mt-1 leading-snug">{apiError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="premium-royal-surface premium-royal-enter premium-royal-enter-delay-2 min-w-0 rounded-xl border-0 p-3 sm:rounded-2xl sm:p-5">
                  <form
                    id="details-form"
                    className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const customerData = Object.fromEntries(
                        formData,
                      ) as Record<string, string>;
                      setCustomer(customerData);
                      placeOrder({ customer: customerData });
                    }}
                  >
                    <div className="min-w-0 space-y-1.5 sm:col-span-2">
                      <Label htmlFor="name" className="text-xs font-bold sm:text-sm">
                        Full name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        autoComplete="name"
                        placeholder="As on CNIC / for delivery"
                        className="h-11"
                        defaultValue={customer.name}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5 sm:col-span-2">
                      <Label htmlFor="phone" className="text-xs font-bold sm:text-sm">
                        Mobile / WhatsApp *
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        required
                        autoComplete="tel"
                        placeholder="03XX XXXXXXX"
                        className="h-11 text-base"
                        defaultValue={customer.phone}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address" className="text-xs font-bold sm:text-sm">
                        Complete address *
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        required
                        autoComplete="street-address"
                        placeholder="House no, street, area, landmark"
                        className="h-11"
                        defaultValue={customer.address}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5 hidden sm:block">
                      <Label htmlFor="city" className="text-xs font-bold sm:text-sm">
                        City <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        list="pakistan-cities"
                        autoComplete="address-level2"
                        placeholder="Karachi, Lahore…"
                        className="h-11"
                        defaultValue={customer.city}
                      />
                      <datalist id="pakistan-cities">
                        <option value="Karachi" />
                        <option value="Lahore" />
                        <option value="Islamabad" />
                        <option value="Rawalpindi" />
                        <option value="Faisalabad" />
                        <option value="Multan" />
                        <option value="Peshawar" />
                        <option value="Quetta" />
                        <option value="Gujranwala" />
                        <option value="Sialkot" />
                        <option value="Abbottabad" />
                        <option value="Hyderabad" />
                      </datalist>
                    </div>
                    <div className="min-w-0 space-y-1.5 hidden sm:block">
                      <Label htmlFor="email" className="text-xs font-bold sm:text-sm">
                        Email <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="Order updates"
                        className="h-11"
                        defaultValue={customer.email}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5 hidden sm:block">
                      <Label htmlFor="postal" className="text-xs font-bold sm:text-sm">
                        Postal code <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="postal"
                        name="postal"
                        autoComplete="postal-code"
                        placeholder="Optional"
                        className="h-11"
                        defaultValue={customer.postal}
                      />
                    </div>

                    <div className="premium-royal-cod-row col-span-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 sm:col-span-2">
                      <Banknote className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          Cash on delivery
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Pay when the parcel reaches you
                        </p>
                      </div>
                    </div>
                  </form>
                </div>

                <details className="mt-3 text-sm sm:hidden">
                  <summary className="cursor-pointer font-semibold text-primary">
                    City or email (optional)
                  </summary>
                  <div className="mt-2 grid gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city-mobile" className="text-xs font-bold">
                        City
                      </Label>
                      <Input
                        id="city-mobile"
                        form="details-form"
                        name="city"
                        list="pakistan-cities-mobile"
                        autoComplete="address-level2"
                        placeholder="Karachi, Lahore…"
                        className="h-11"
                        defaultValue={customer.city}
                      />
                      <datalist id="pakistan-cities-mobile">
                        <option value="Karachi" />
                        <option value="Lahore" />
                        <option value="Islamabad" />
                        <option value="Rawalpindi" />
                        <option value="Faisalabad" />
                        <option value="Multan" />
                        <option value="Peshawar" />
                        <option value="Quetta" />
                        <option value="Gujranwala" />
                        <option value="Sialkot" />
                        <option value="Abbottabad" />
                        <option value="Hyderabad" />
                      </datalist>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-mobile" className="text-xs font-bold">
                        Email
                      </Label>
                      <Input
                        id="email-mobile"
                        form="details-form"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="For order confirmation"
                        className="h-11"
                        defaultValue={customer.email}
                      />
                    </div>
                  </div>
                </details>

                <div className="mt-3 lg:hidden">
                  <CheckoutCodAssist
                    compact
                    freeShippingThreshold={Number(config.freeShippingThreshold ?? 0)}
                    shippingFee={Number(config.shippingFee ?? 0)}
                    whatsappNumber={config.whatsappNumber}
                    supportPhone={config.supportPhone}
                  />
                </div>

                <div className="mt-4 hidden lg:block">
                  <CheckoutCodAssist
                    freeShippingThreshold={Number(config.freeShippingThreshold ?? 0)}
                    shippingFee={Number(config.shippingFee ?? 0)}
                    whatsappNumber={config.whatsappNumber}
                    supportPhone={config.supportPhone}
                  />
                </div>

                <p className="mt-3 hidden items-center gap-3 text-[10px] text-muted-foreground sm:flex sm:flex-wrap sm:text-xs">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {config.warrantyMonths || 12}mo warranty
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5 text-primary" />
                    {config.returnWindowDays || 7}-day returns
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Secure checkout
                  </span>
                </p>

                {priceChanged ? (
                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-sm text-amber-800 lg:hidden">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          Prices updated while processing.
                        </p>
                        <p className="mt-1 text-xs leading-snug">
                          Review the summary below before placing your order again.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <CheckoutMobileOrderBox
                  className="premium-royal-shine premium-royal-enter premium-royal-enter-delay-3 mt-4 lg:hidden"
                  items={items}
                  productHref={productHref}
                  subtotal={subtotal}
                  dealDiscount={dealDiscount}
                  dealTitle={dealQuote.applied[0]?.title}
                  shippingLabel={shippingLabel}
                  appliedDiscount={appliedDiscount}
                  giftWrap={giftWrap}
                  giftWrapFee={GIFT_WRAP_FEE}
                  total={total}
                  hasPromo={hasPromo}
                  placing={placing}
                  promoInput={promoInput}
                  onPromoInputChange={setPromoInput}
                  onApplyPromo={handleApplyPromo}
                  promoLoading={activePromo?.loading}
                  promoError={activePromo?.error}
                  promoCode={
                    activePromo && !activePromo.error ? activePromo.code : undefined
                  }
                  onRemovePromo={() => setActivePromo(null)}
                />
              </section>
            )}
          </div>

          {/* ── Order summary sidebar (desktop) ─────────────────────────────── */}
          <aside className="order-2 hidden w-full space-y-3 lg:block lg:order-none lg:sticky lg:top-8 lg:self-start lg:space-y-5">
            <div className={cn(SUMMARY_CARD, "p-3 sm:p-4 lg:p-5")}>
              <h2 className="mb-2 border-b border-[var(--g-line)] pb-2 text-sm font-bold text-foreground sm:mb-3 sm:pb-3 sm:text-base lg:text-[17px]">
                Order summary
              </h2>

              <div className="space-y-2.5 border-b border-[var(--g-line)] pb-3.5 sm:space-y-3 sm:pb-4">
                <CheckoutSummaryPriceRow
                  label={`Subtotal (${items.reduce((acc, i) => acc + i.quantity, 0)} items)`}
                  value={formatPrice(subtotal)}
                />
                {dealDiscount > 0 ? (
                  <CheckoutSummaryPriceRow
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
                <CheckoutSummaryPriceRow
                  label="Shipping"
                  value={shippingLabel ?? "—"}
                />
                {activePromo ? (
                  <CheckoutSummaryPriceRow
                    tone="deal"
                    label="Promo discount"
                    value={`− ${formatPrice(appliedDiscount)}`}
                  />
                ) : null}
                {giftWrap ? (
                  <CheckoutSummaryPriceRow
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

            {step >= 1 && (
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
              <div className="hidden rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-sm text-amber-800 lg:block">
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

            {step >= 1 && (
              <div className={SUMMARY_CARD}>
                <div className="mb-4 grid grid-cols-1 gap-3 border-b border-[var(--g-line)] pb-4 sm:mb-5 sm:grid-cols-2 sm:gap-3.5 sm:pb-5">
                  {[
                    {
                      icon: ShieldCheck,
                      title: `${config.warrantyMonths || 12}-Month Warranty`,
                      detail: "Guaranteed authentic",
                    },
                    {
                      icon: RotateCcw,
                      title: `${config.returnWindowDays || 7}-Day Easy Returns`,
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
                  form="details-form"
                  type="submit"
                  disabled={placing}
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

                <div className="mt-5 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 text-sm w-full sm:w-auto"
                    onClick={() => router.push(shopHref)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Continue Shopping
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {step === 1 && showMobileDock ? (
        <div
          className="premium-royal-dock fixed inset-x-0 bottom-0 z-40 bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
          aria-hidden={false}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Total · COD
              </p>
              <p className="text-xl font-black tabular-nums text-primary">
                {formatPrice(total)}
              </p>
              <button
                type="button"
                className="mt-0.5 text-[11px] font-bold text-primary underline underline-offset-2"
                onClick={() =>
                  document
                    .getElementById("checkout-order-box")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                View order &amp; delivery cost
              </button>
            </div>
            <Button
              form="details-form"
              type="submit"
              disabled={placing}
              className="h-12 min-h-11 flex-1 gap-2 text-base font-bold shadow-md"
            >
              {placing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 shrink-0" />
              )}
              {placing ? "Processing…" : "Place order"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
