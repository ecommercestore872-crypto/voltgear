"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  Loader2,
  Lock,
  ShieldCheck,
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
import { StorefrontLink as Link } from "@/components/navigation/storefront-link";

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
import { FunnelTrustStrip } from "@/components/checkout/funnel-trust-strip";
import { CheckoutMobileOrderBox } from "@/components/checkout/checkout-mobile-order-box";
import { CheckoutDesktopSidebar } from "@/components/checkout/checkout-desktop-sidebar";
import { useCheckoutMobileDock } from "@/components/checkout/use-checkout-mobile-dock";
import { useSiteConfig } from "@/lib/use-site-config";
import type { PriceMismatch } from "@/lib/checkout-server";
import {
  tagCheckoutClarityEvent,
  tagCheckoutClarityStep,
} from "@/lib/checkout-clarity";
import { normalizePhone } from "@/lib/messaging";
import { trackMetaInitiateCheckout, trackMetaPurchase } from "@/lib/meta-pixel-events";
import {
  validateCheckoutFormField,
  validateCheckoutFormFields,
  type CheckoutFormField,
} from "@/lib/checkout-form-fields";
import {
  buildCheckoutOrderBody,
  requestCheckoutOrder,
  requestCheckoutPromo,
} from "@/lib/checkout-client-api";
import {
  CHECKOUT_IDEMPOTENCY_STORAGE_KEY,
  getOrCreateCheckoutIdempotency,
  type CheckoutIdempotencyState,
} from "@/lib/checkout-idempotency-client";
import { getCitiesForProvince, PAKISTAN_PROVINCES } from "@/lib/pakistan-locations";

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

  }, []);

  // step: 0 = Cart, 1 = Information, 2 = Review, 3 = Complete (implicit on placedOrder)
  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [orderNotes, setOrderNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);
  const orderNavigationRef = useRef(false);
  const [customer, setCustomer] = useState<Record<string, string>>({});
  const [selectedProvince, setSelectedProvince] = useState("");
  const [otherCity, setOtherCity] = useState(false);
  const [cityValue, setCityValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CheckoutFormField, string>>
  >({});

  function touchField(field: CheckoutFormField, value: string) {
    const msg = validateCheckoutFormField(field, value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: msg ?? undefined,
    }));
  }

  function clearFieldError(field: CheckoutFormField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }
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
  const idemRef = useRef<CheckoutIdempotencyState | null>(null);
  const showMobileDock = useCheckoutMobileDock(
    step === 1 && items.length > 0,
  );

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
      const { response, data } = await requestCheckoutPromo({
        code: promoInput.trim(),
        subtotal: merchandise,
        shipping: baseShipping,
        email: customer.email?.trim().toLowerCase() || undefined,
      });
      if (!response.ok || data.ok !== true) {
        setActivePromo({
          code: promoInput.trim(),
          discount: 0,
          shipping: baseShipping,
          error:
            ("error" in data ? data.error : undefined) || "Invalid promo code",
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

    if (placingRef.current || orderNavigationRef.current) return;
    placingRef.current = true;
    tagCheckoutClarityEvent("place_order_click");
    setPlacing(true);
    setPriceChanged(null);
    setApiError(null);

    try {
      let storage: Pick<Storage, "getItem" | "setItem">;
      try {
        storage = window.sessionStorage;
      } catch {
        storage = { getItem: () => null, setItem: () => {} };
      }
      const idempotency = getOrCreateCheckoutIdempotency({
        items,
        details: {
          customer: currentCustomer,
          note: orderNotes.trim(),
          giftWrap,
          promoCode: activePromo?.error ? "" : activePromo?.code ?? "",
          prices: items.map((item) => item.price),
        },
        storage,
        current: idemRef.current,
      });
      idemRef.current = idempotency;
      const activeIdemKey = idempotency.key;
      let cookieConsent: string | null = null;
      try { cookieConsent = window.localStorage.getItem("bnt-cookie-consent"); } catch {}
      const orderBody = buildCheckoutOrderBody({
        items,
        customer: {
          ...currentCustomer,
        },
        orderNotes,
        paymentMethod: payment,
        subtotal,
        shipping,
        total,
        giftWrap,
        giftWrapFee: giftWrap ? GIFT_WRAP_FEE : 0,
        idempotencyKey: activeIdemKey,
        consent: cookieConsent,
        promoCode:
          activePromo?.code && !activePromo.error
            ? activePromo.code
            : undefined,
        attribution: readStoredClickAttribution() ?? undefined,
      });
      const { response, data } = await requestCheckoutOrder(
        orderBody,
        activeIdemKey,
      );

      if (response.status === 409 && data.code === "PRICE_CHANGED") {
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
        placingRef.current = false;
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed");
      }
      if (!data.orderId) {
        throw new Error("Checkout returned an invalid order response.");
      }
      const orderId = data.orderId;
      try { tagCheckoutClarityEvent("order_success"); } catch {}
      try { window.sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY); } catch {}
      idemRef.current = null;

      const lookupEmail =
        typeof data.lookupEmail === "string" && data.lookupEmail.trim()
          ? data.lookupEmail.trim().toLowerCase()
          : currentCustomer.email?.trim().toLowerCase() ?? "";
      if (lookupEmail && typeof document !== "undefined") {
        try {
          const maxAge = 60 * 60 * 24;
          document.cookie = `bnt_order_${encodeURIComponent(orderId)}=${encodeURIComponent(lookupEmail)}; Path=/order/${encodeURIComponent(orderId)}; Max-Age=${maxAge}; SameSite=Lax`;
        } catch {}
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
        try { saveLastOrder({
          at: Date.now(),
          orderId,
          email: lookupEmail,
          name: currentCustomer.name?.trim() ?? "",
          product: { slug: first.slug, name: first.name },
        }); } catch {}
      }

      orderNavigationRef.current = true;
      try { window.scrollTo({ top: 0, behavior: "instant" }); } catch {}
      router.replace(`/order/${orderId}${orderQs}`);

      window.setTimeout(() => {
        clearCart();
        void identifyTikTokCustomer({
          email: lookupEmail || currentCustomer.email,
          phone: currentCustomer.phone,
        });
        if (!data.replayed) {
          try {
            trackTikTokPurchase({
              orderId,
              total: purchaseTotal,
              lines: serverLines,
            });
          } catch {
            // fail-open
          }
          try {
            trackMetaPurchase({
              orderId,
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
      placingRef.current = false;
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
                    Enter your delivery details. Email and postal code are optional.
                  </p>
                </div>

                <FunnelTrustStrip className="premium-royal-enter premium-royal-enter-delay-1 mb-4" />

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
                    noValidate
                    className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const customerData = Object.fromEntries(
                        formData,
                      ) as Record<string, string>;
                      const errors = validateCheckoutFormFields(customerData);
                      if (Object.keys(errors).length > 0) {
                        setFieldErrors(errors);
                        return;
                      }
                      setFieldErrors({});
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
                        className={cn(
                          "h-11 text-base",
                          fieldErrors.name && "border-destructive",
                        )}
                        defaultValue={customer.name}
                        aria-invalid={fieldErrors.name ? true : undefined}
                        aria-describedby={
                          fieldErrors.name ? "checkout-name-error" : undefined
                        }
                        onBlur={(e) => touchField("name", e.target.value)}
                        onChange={() => clearFieldError("name")}
                      />
                      {fieldErrors.name ? (
                        <p
                          id="checkout-name-error"
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {fieldErrors.name}
                        </p>
                      ) : null}
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
                        className={cn(
                          "h-11 text-base",
                          fieldErrors.phone && "border-destructive",
                        )}
                        defaultValue={customer.phone}
                        aria-invalid={fieldErrors.phone ? true : undefined}
                        aria-describedby={
                          fieldErrors.phone ? "checkout-phone-error" : undefined
                        }
                        onBlur={(e) => touchField("phone", e.target.value)}
                        onChange={() => clearFieldError("phone")}
                      />
                      {fieldErrors.phone ? (
                        <p
                          id="checkout-phone-error"
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {fieldErrors.phone}
                        </p>
                      ) : null}
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
                        className={cn(
                          "h-11 text-base",
                          fieldErrors.address && "border-destructive",
                        )}
                        defaultValue={customer.address}
                        aria-invalid={fieldErrors.address ? true : undefined}
                        aria-describedby={
                          fieldErrors.address
                            ? "checkout-address-error"
                            : undefined
                        }
                        onBlur={(e) => touchField("address", e.target.value)}
                        onChange={() => clearFieldError("address")}
                      />
                      {fieldErrors.address ? (
                        <p
                          id="checkout-address-error"
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {fieldErrors.address}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="province" className="text-xs font-bold sm:text-sm">
                        Province / region *
                      </Label>
                      <select
                        id="province"
                        name="province"
                        required
                        autoComplete="address-level1"
                        value={selectedProvince}
                        className={cn("h-11 w-full rounded-md border bg-background px-3 text-base", fieldErrors.province && "border-destructive")}
                        aria-invalid={fieldErrors.province ? true : undefined}
                        aria-describedby={fieldErrors.province ? "checkout-province-error" : undefined}
                        onChange={(e) => {
                          setSelectedProvince(e.target.value);
                          setCityValue("");
                          setOtherCity(false);
                          clearFieldError("province");
                          clearFieldError("city");
                        }}
                        onBlur={(e) => touchField("province", e.target.value)}
                      >
                        <option value="">Select province / region</option>
                        {PAKISTAN_PROVINCES.map((province) => (
                          <option key={province.code} value={province.code}>{province.label}</option>
                        ))}
                      </select>
                      {fieldErrors.province ? <p id="checkout-province-error" className="text-xs text-destructive" role="alert">{fieldErrors.province}</p> : null}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="city" className="text-xs font-bold sm:text-sm">
                        City / town *
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        required
                        disabled={!selectedProvince}
                        list={otherCity ? undefined : "checkout-pakistan-cities"}
                        autoComplete="address-level2"
                        placeholder={otherCity ? "Enter your city or town" : "Search city or town"}
                        className={cn("h-11 text-base", fieldErrors.city && "border-destructive")}
                        value={cityValue}
                        aria-invalid={fieldErrors.city ? true : undefined}
                        aria-describedby={fieldErrors.city ? "checkout-city-error" : undefined}
                        onChange={(e) => { setCityValue(e.target.value); clearFieldError("city"); }}
                        onBlur={(e) => touchField("city", e.target.value)}
                      />
                      <datalist id="checkout-pakistan-cities">
                        {getCitiesForProvince(selectedProvince).map((city) => (
                          <option key={city.name} value={city.name} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary underline underline-offset-2"
                        disabled={!selectedProvince}
                        onClick={() => { setOtherCity((value) => !value); setCityValue(""); clearFieldError("city"); }}
                      >
                        {otherCity ? "Back to city suggestions" : "Other city / town"}
                      </button>
                      {fieldErrors.city ? <p id="checkout-city-error" className="text-xs text-destructive" role="alert">{fieldErrors.city}</p> : null}
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Courier coverage is checked before dispatch. We will contact you if your location needs manual review.
                    </p>
                    <div className="min-w-0 space-y-1.5">
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
                    <div className="min-w-0 space-y-1.5">
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
                  {config.warrantyMonths ? (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      {config.warrantyMonths}mo warranty
                    </span>
                  ) : null}
                  {config.returnWindowDays ? (
                    <span className="inline-flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5 text-primary" />
                      {config.returnWindowDays}-day returns
                    </span>
                  ) : null}
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

          <CheckoutDesktopSidebar
            step={step}
            itemCount={items.reduce((count, item) => count + item.quantity, 0)}
            subtotal={subtotal}
            dealDiscount={dealDiscount}
            dealTitle={dealQuote.applied[0]?.title}
            shippingLabel={shippingLabel}
            activePromo={activePromo}
            hasPromo={hasPromo}
            appliedDiscount={appliedDiscount}
            giftWrap={giftWrap}
            giftWrapFee={GIFT_WRAP_FEE}
            total={total}
            promoInput={promoInput}
            placing={placing}
            priceChanged={Boolean(priceChanged)}
            warrantyMonths={config.warrantyMonths}
            returnWindowDays={config.returnWindowDays}
            onPromoInputChange={setPromoInput}
            onApplyPromo={handleApplyPromo}
            onRemovePromo={() => setActivePromo(null)}
            onContinueShopping={() => router.push(shopHref)}
          />
        </div>
      </div>

      {step === 1 && showMobileDock ? (
        <div
          className="premium-royal-dock touch-manipulation fixed inset-x-0 bottom-0 z-40 bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
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
