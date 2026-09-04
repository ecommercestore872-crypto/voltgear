"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronLeft,
  ClipboardList,
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
import { saveLastOrder } from "@/lib/review-reminder";
import { formatPrice } from "@/lib/utils";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
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
  const {
    items,
    subtotal,
    updateQuantity,
    updateItemPrice,
    removeItem,
    clearCart,
  } = useCart();
  const config = useSiteConfig();
  const [gadget, setGadget] = useState(false);
  const shopHref = gadget ? products2Href() : "/products";
  const productHref = (slug: string) => (gadget ? product2Href(slug) : `/product/${slug}`);

  useEffect(() => {
    try {
      const fromGadget = new URLSearchParams(window.location.search).get("from") === "gadget";
      if (fromGadget) sessionStorage.setItem(GADGET_SESSION_KEY, "1");
      setGadget(fromGadget || readGadgetPreviewSession());
    } catch {
      setGadget(false);
    }
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
  const [activePromo, setActivePromo] = useState<{ code: string; discount: number; shipping: number; error?: string; loading?: boolean } | null>(null);
  const [priceChanged, setPriceChanged] = useState<
    | {
        items: PriceMismatch[];
        subtotal: number;
        shipping: number;
        total: number;
      }
    | null
  >(null);

  const GIFT_WRAP_FEE = 199;
  
  const baseShipping = subtotal === 0 || subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee;
  const shipping = activePromo && !activePromo.error ? activePromo.shipping : baseShipping;
  const appliedDiscount = activePromo && !activePromo.error ? activePromo.discount : 0;
  const subDiscount = (activePromo && !activePromo.error && activePromo.shipping === baseShipping) ? appliedDiscount : 0;
  
  const total = (subtotal + shipping + (giftWrap ? GIFT_WRAP_FEE : 0)) - subDiscount;
  const hasPromo = !!activePromo && !activePromo.error;

  async function handleApplyPromo() {
    if (!promoInput.trim()) {
      setActivePromo(null);
      return;
    }
    setActivePromo({ code: promoInput.trim(), discount: 0, shipping: baseShipping, loading: true });
    
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), subtotal, shipping: baseShipping }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActivePromo({ code: promoInput.trim(), discount: 0, shipping: baseShipping, error: data.error || "Invalid promo code" });
      } else {
        setActivePromo({ code: data.code, discount: data.discount, shipping: data.shipping });
        setPromoInput("");
      }
    } catch(err) {
      setActivePromo({ code: promoInput.trim(), discount: 0, shipping: baseShipping, error: "Network error" });
    }
  }

  const shippingLabel = useMemo(() => {
    if (subtotal === 0) return null;
    if (shipping === 0) return "Free";
    const remaining = config.freeShippingThreshold - subtotal;
    return remaining > 0
      ? `${formatPrice(shipping)} (add ${formatPrice(remaining)} more for free shipping)`
      : "Free";
  }, [subtotal, shipping, config.freeShippingThreshold]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            ...(i.variantKey ? { variantKey: i.variantKey } : {}),
            ...(i.variantName ? { variantName: i.variantName } : {}),
            ...(i.variantSku ? { variantSku: i.variantSku } : {}),
          })),
          customer, // contains name, email, phone, etc
          payment: { method: payment },
          subtotal,
          shipping,
          total, // actual final total including pseudo promos could break backend signature check in real app if api doesn't support promo, but keeping identical
          giftWrap,
          giftWrapFee: giftWrap ? GIFT_WRAP_FEE : 0,
          ...(activePromo?.code && !activePromo.error ? { promoCode: activePromo.code } : {}),
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
            line.price
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
          typeof data.error === "string" ? data.error : undefined
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
      setPlacedTotal(typeof data.total === "number" ? data.total : total);
      setPlacedItems([...items]);
      setPriceChanged(null);
      trackPurchase(data.orderId, analyticsItems(), total);
      clearCart();
      const first = items[0];
      if (first) {
        saveLastOrder({
          at: Date.now(),
          orderId: data.orderId,
          email: customer.email?.trim().toLowerCase() ?? "",
          name: customer.fullName?.trim() ?? "",
          product: { slug: first.slug, name: first.name },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong placing your order. Please try again.";
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
        <div className="min-h-screen bg-[var(--g-cream)] pt-8 pb-16 lg:pt-12 lg:pb-32 border-t border-[var(--g-line)] text-[var(--g-charcoal)] animate-premium-fade">
          <div className="container mx-auto max-w-6xl px-4 lg:px-8 space-y-6">
            
            {/* Top section: Status & Progress */}
            <div className="grid gap-6 lg:grid-cols-[1fr_560px] items-stretch animate-premium-slide">
               {/* Left: Thank You Banner */}
               <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm relative overflow-hidden group">
                  {/* Subtle background decoration */}
                  <div className="absolute -left-16 -top-16 w-32 h-32 rounded-full border-[20px] border-[var(--g-forest)]/5 opacity-50 transition-transform duration-700 group-hover:scale-110" />
                  <div className="shrink-0 flex items-center justify-center relative">
                     <div className="w-24 h-24 rounded-full border-[6px] border-[var(--g-forest)]/20 bg-[var(--g-forest)]/10 flex items-center justify-center relative overflow-hidden">
                        <Check className="w-12 h-12 text-[var(--g-forest)] stroke-[3] animate-in zoom-in duration-500 delay-150 fill-mode-backwards" />
                        <div className="absolute inset-0 rounded-full animate-ping border-[4px] border-[var(--g-forest)] opacity-20 duration-1000" />
                     </div>
                     {/* decorative floating pluses */}
                     <span className="absolute top-0 right-0 text-[var(--g-forest)] font-bold text-xs animate-bounce">+</span>
                     <span className="absolute bottom-4 left-0 text-[var(--g-forest)] font-bold text-xs animate-pulse">+</span>
                  </div>
                  <div className="flex-1 relative z-10 text-center sm:text-left mt-2 sm:mt-0">
                     <span className="inline-block px-3 py-1 rounded-full bg-[var(--g-forest)]/10 text-[var(--g-forest)] text-[11px] font-bold uppercase tracking-widest mb-3 border border-[var(--g-forest)]/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-backwards">
                        Thank You!
                     </span>
                     <h1 className="text-3xl sm:text-[34px] font-extrabold text-[var(--g-charcoal)] tracking-tight leading-tight mb-2 gadget-display">Order Confirmed!</h1>
                     <p className="text-sm font-medium text-[var(--g-taupe)] leading-relaxed max-w-sm mx-auto sm:mx-0 pr-0 sm:pr-4">
                        Your order has been placed successfully. We&rsquo;ve received your order and will get it ready to ship as soon as possible.
                     </p>
                  </div>
               </div>

               {/* Right: Progress Tracker */}
               <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] p-8 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow">
                  <div className="w-full max-w-[420px] mx-auto grid grid-cols-4 relative text-center">
                     {/* Connecting Line */}
                     <div className="absolute left-[12.5%] right-[12.5%] top-4 h-[2px] border-t-2 border-dashed border-[var(--g-line)] -z-10" />
                     
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)] text-[var(--g-white)] flex items-center justify-center outline outline-[4px] outline-[var(--g-white)] shadow-sm shrink-0 relative animate-in pop-in duration-500">
                           <Check className="w-4 h-4 stroke-[3]" />
                           <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--g-white)] animate-pulse" />
                        </div>
                        <div className="mt-1">
                           <p className="text-xs font-bold text-[var(--g-charcoal)]">Confirmed</p>
                           <p className="text-[10px] font-semibold text-[var(--g-forest)] mt-1">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-cream)] text-[var(--g-taupe)] flex items-center justify-center outline outline-[3px] outline-[var(--g-white)] border border-[var(--g-line)] shadow-sm shrink-0">
                           <Package className="w-4 h-4" />
                        </div>
                        <div className="mt-1">
                           <p className="text-xs font-bold text-[var(--g-taupe)]">Processing</p>
                           <p className="text-[10px] font-medium mt-1 leading-tight text-[var(--g-taupe)]/80">We&rsquo;re preparing<br/>your order</p>
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-cream)] text-[var(--g-taupe)] flex items-center justify-center outline outline-[3px] outline-[var(--g-white)] border border-[var(--g-line)] shadow-sm shrink-0">
                           <Truck className="w-4 h-4" />
                        </div>
                        <div className="mt-1">
                           <p className="text-xs font-bold text-[var(--g-taupe)]">Shipped</p>
                           <p className="text-[10px] font-medium mt-1 leading-tight text-[var(--g-taupe)]/80">On the way to<br/>you</p>
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-3 opacity-30 hover:opacity-100 transition-opacity cursor-default">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-cream)] text-[var(--g-taupe)] flex items-center justify-center outline outline-[3px] outline-[var(--g-white)] border border-[var(--g-line)] shadow-sm shrink-0">
                           <Home className="w-4 h-4" />
                        </div>
                        <div className="mt-1">
                           <p className="text-xs font-bold text-[var(--g-taupe)]">Delivered</p>
                           <p className="text-[10px] font-medium mt-1 leading-tight text-[var(--g-taupe)]/80">Get ready to<br/>enjoy!</p>
                        </div>
                     </div>

                  </div>
               </div>
            </div>

            {/* Middle section: Details & Items Grid */}
            <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
               {/* Order Details */}
               <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] shadow-sm overflow-hidden flex flex-col relative transition-all hover:shadow-md">
                  <div className="border-b border-[var(--g-line)] p-5 flex items-center gap-3 bg-[var(--g-cream)]/50">
                     <ClipboardList className="w-5 h-5 text-[var(--g-forest)]" strokeWidth={2.5}/>
                     <h3 className="font-bold text-[15px] text-[var(--g-charcoal)]">Order Details</h3>
                  </div>
                  <div className="p-6 grid gap-y-7 gap-x-6 sm:grid-cols-2">
                     <div className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 font-bold tracking-tight transition-transform group-hover:scale-110">#</div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Order Number</p>
                           <p className="text-[14px] font-bold text-[var(--g-forest)] mt-1 tracking-tight">{placedOrder}</p>
                        </div>
                     </div>
                     <div className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Mail className="w-4 h-4"/></div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Confirmation Email</p>
                           <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-[13px] font-bold text-[var(--g-charcoal)] truncate max-w-[150px] sm:max-w-none">{customer.email || 'customer@example.com'}</p>
                              <span className="text-[9px] font-bold bg-[var(--g-forest)]/10 text-[var(--g-forest)] px-1.5 py-0.5 rounded uppercase tracking-wider border border-[var(--g-forest)]/20 animate-pulse">Sent</span>
                           </div>
                           <p className="text-[11px] text-[var(--g-taupe)] mt-1">A confirmation has been sent.</p>
                        </div>
                     </div>
                     <div className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Calendar className="w-4 h-4"/></div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Order Date</p>
                           <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1">{new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric'})}</p>
                        </div>
                     </div>
                     <div className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Truck className="w-4 h-4"/></div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Estimated Delivery</p>
                           <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1">
                              {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &ndash; {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </p>
                           <p className="text-[11px] font-medium text-[var(--g-taupe)] mt-1">(2–4 Working Days)</p>
                        </div>
                     </div>
                     <div className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Banknote className="w-4 h-4"/></div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Payment Method</p>
                           <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1">Cash on Delivery (COD)</p>
                        </div>
                     </div>
                     <div className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><MapPin className="w-4 h-4"/></div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Shipping Address</p>
                           <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1 capitalize">{customer.name || 'Ahmed Raza'}</p>
                           <p className="text-[12px] text-[var(--g-taupe)] mt-1 leading-snug">
                              {customer.address || 'House 123, Street 5, Block C'}<br/>
                              {customer.city || 'Lahore'}, Pakistan
                           </p>
                        </div>
                     </div>
                     <div className="flex gap-4 sm:col-span-2 pt-6 border-t border-[var(--g-line)] items-start group">
                        <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><ShoppingBag className="w-4 h-4"/></div>
                        <div className="mt-0.5">
                           <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Total Amount</p>
                           <p className="text-[20px] font-black text-[var(--g-forest)] mt-1 tabular-nums">{formatPrice(placedTotal ?? total)}</p>
                           <p className="text-[11px] font-medium text-[var(--g-taupe)] mt-1">(Inclusive of all taxes)</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Items Box Sidebar */}
               <div className="flex flex-col gap-4">
                  <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] shadow-sm overflow-hidden flex flex-col flex-1 relative hover:shadow-md transition-shadow">
                     <div className="border-b border-[var(--g-line)] p-5 flex items-center justify-between bg-[var(--g-cream)]/50">
                        <div className="flex items-center gap-3">
                           <ClipboardList className="w-5 h-5 text-[var(--g-forest)]" strokeWidth={2.5} />
                           <h3 className="font-bold text-[14px] text-[var(--g-charcoal)]">Items in Your Order ({placedItems.length || 0})</h3>
                        </div>
                        <span className="text-[12px] font-bold text-[var(--g-forest)] hover:underline cursor-pointer">View Details</span>
                     </div>
                     <ul className="divide-y divide-[var(--g-line)] p-5 flex-1 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {placedItems.length === 0 ? (
                           <div className="text-center py-8 flex flex-col items-center justify-center">
                              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-3" />
                              <span className="text-sm text-muted-foreground font-medium">Preparing your order items...</span>
                           </div>
                        ) : (
                           placedItems.map((item, i) => (
                              <li key={cartLineKey(item) + i} className="py-5 flex gap-4 first:pt-2 last:pb-1 group/item">
                                 {item.image ? (
                                    <div className="h-16 w-16 shrink-0 rounded-xl bg-[var(--g-cream)] border border-[var(--g-line)] relative overflow-hidden flex items-center justify-center p-1.5 shadow-sm">
                                      <Image src={item.image} alt={item.name} fill className="object-contain p-1.5 mix-blend-multiply transition-transform duration-500 group-hover/item:scale-110" />
                                    </div>
                                 ) : (
                                    <div className="h-16 w-16 shrink-0 rounded-xl bg-muted border border-[var(--g-line)] shadow-sm" />
                                 )}
                                 <div className="flex flex-1 flex-col justify-center">
                                    <div className="flex items-start justify-between gap-4 w-full">
                                       <div className="flex-1">
                                          <p className="text-[13px] font-bold text-[var(--g-charcoal)] line-clamp-2 leading-relaxed tracking-tight group-hover/item:text-[var(--g-forest)] transition-colors">{item.name}</p>
                                          {item.variantName ? (
                                             <p className="text-[11.5px] font-medium text-[var(--g-taupe)] mt-1.5">{item.variantName}</p>
                                          ) : null}
                                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--g-cream)] border border-[var(--g-line)] mt-2">
                                             <span className="text-[11px] font-semibold text-[var(--g-charcoal)]">Qty: {item.quantity}</span>
                                          </div>
                                       </div>
                                       <span className="text-[14px] font-bold text-[var(--g-charcoal)] tabular-nums shrink-0">{formatPrice(item.price)}</span>
                                    </div>
                                 </div>
                              </li>
                           ))
                        )}
                     </ul>
                  </div>
               </div>
            </div>

            {/* Actions Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8 animate-premium-fade">
               <Button size="lg" className="h-12 px-10 text-[14px] font-bold tracking-wide w-full sm:w-auto shadow-sm bg-[var(--g-forest)] hover:bg-[var(--g-forest)]/90 text-[var(--g-white)] rounded border border-[var(--g-forest)] transition-transform hover:-translate-y-0.5">
                  <Package className="w-4 h-4 mr-2" /> Track Your Order
               </Button>
               <Button asChild size="lg" variant="outline" className="h-12 px-10 text-[14px] font-bold tracking-wide w-full sm:w-auto bg-[var(--g-white)] hover:bg-[var(--g-cream)] text-[var(--g-charcoal)] border-[var(--g-line)] shadow-sm rounded transition-transform hover:-translate-y-0.5">
                  <Link href="/products">
                     <ShoppingBag className="w-4 h-4 mr-2 text-[var(--g-taupe)]" /> Continue Shopping
                  </Link>
               </Button>
            </div>
            
            <div className="flex items-center justify-center gap-5 text-[13px] font-semibold text-[var(--g-forest)] pt-2 animate-premium-fade">
               <button className="flex items-center gap-1.5 hover:underline decoration-[var(--g-forest)]/30 underline-offset-4 transition-all"><ClipboardList className="w-4 h-4"/> Download Invoice</button>
               <span className="w-px h-3 bg-[var(--g-line)]" />
               <Link href="/contact" className="flex items-center gap-1.5 hover:underline text-[var(--g-taupe)] decoration-[var(--g-taupe)]/30 underline-offset-4 transition-all"><Headphones className="w-4 h-4"/> Need help? <span className="text-[var(--g-forest)] font-bold ml-0.5 hover:underline decoration-[var(--g-forest)]/30">Contact Support</span></Link>
            </div>

            {/* Bottom Support Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 lg:mt-20 bg-[var(--g-white)] rounded-2xl border border-[var(--g-line)] shadow-sm p-4 sm:p-6 w-full divide-y md:divide-y-0 md:divide-x divide-[var(--g-line)] animate-premium-slide">
               <div className="flex gap-5 p-2 md:p-4 pb-6 md:pb-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-[var(--g-cream)] text-[var(--g-forest)] flex items-center justify-center shrink-0 border border-[var(--g-line)] transition-transform group-hover:scale-110 group-hover:bg-[var(--g-forest)] group-hover:text-[var(--g-white)]">
                     <Headphones className="w-5 h-5"/>
                  </div>
                  <div className="pt-0.5">
                     <p className="text-[14px] font-bold text-[var(--g-charcoal)]">Need help?</p>
                     <p className="text-[12px] text-[var(--g-taupe)] mt-1 mb-3 leading-relaxed max-w-[220px]">We&rsquo;re here to help you with any questions.</p>
                     <Link href="/contact" className="text-[12.5px] font-bold text-[var(--g-forest)] flex items-center hover:underline transition-colors">Contact Support <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
                  </div>
               </div>
               <div className="flex gap-5 p-2 md:p-4 py-6 md:py-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-[var(--g-cream)] text-[var(--g-forest)] flex items-center justify-center shrink-0 border border-[var(--g-line)] transition-transform group-hover:scale-110 group-hover:bg-[var(--g-forest)] group-hover:text-[var(--g-white)]">
                     <ShieldCheck className="w-5 h-5"/>
                  </div>
                  <div className="pt-0.5">
                     <p className="text-[14px] font-bold text-[var(--g-charcoal)]">Easy Returns</p>
                     <p className="text-[12px] text-[var(--g-taupe)] mt-1 mb-3 leading-relaxed max-w-[220px]">7 days easy returns and 1 year warranty on all products.</p>
                     <Link href="/warranty" className="text-[12.5px] font-bold text-[var(--g-forest)] flex items-center hover:underline transition-colors">Learn More <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
                  </div>
               </div>
               <div className="flex gap-5 p-2 md:p-4 pt-6 md:pt-4 group cursor-pointer mb-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--g-cream)] text-[var(--g-charcoal)] flex items-center justify-center shrink-0 border border-[var(--g-line)] transition-all group-hover:scale-110 group-hover:bg-[#25D366] group-hover:text-white group-hover:border-[#25D366]">
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </div>
                  <div className="pt-0.5">
                     <p className="text-[14px] font-bold text-[var(--g-charcoal)]">Chat with us on WhatsApp</p>
                     <p className="text-[12px] text-[var(--g-taupe)] mt-1 mb-3 leading-relaxed max-w-[220px]">Get quick support on WhatsApp during business hours.</p>
                     <Link href="https://wa.me/92300000000" className="text-[12.5px] font-bold text-[var(--g-charcoal)] group-hover:text-[#25D366] flex items-center hover:underline transition-colors">Chat Now <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
                  </div>
               </div>
            </div>

          </div>
        </div>
    );
  }

  /* ── Empty cart ─────────────────────────────────────────────────── */
  if (items.length === 0 && step === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 lg:px-8">
        <div className="rounded-2xl border border-dashed p-12 text-center">
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
    <div className="min-h-screen bg-white">
      {/* Breadcrumb matching Figma */}
      <div className="container mx-auto px-4 pt-6 lg:px-8 text-sm text-foreground/60 hidden sm:block">
        Home <span className="mx-1">&gt;</span> <span className="text-primary font-medium">Checkout</span>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* ── Left Content Column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            
            {step === 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold tracking-tight">Your Cart</h2>
                  <Link href="/products" className="text-sm font-bold text-primary hover:underline">
                    Continue Shopping
                  </Link>
                </div>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li key={cartLineKey(item)} className="p-6 sm:p-8">
                        <div className="flex gap-4 sm:gap-6">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={96}
                              height={96}
                              className="h-24 w-24 shrink-0 rounded-lg border bg-muted object-cover"
                            />
                          ) : (
                            <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted" />
                          )}
                          <div className="flex flex-1 flex-col pb-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
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
                                    updateQuantity(cartLineKey(item), item.quantity - 1)
                                  }
                                  aria-label="Decrease quantity"
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-foreground">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(cartLineKey(item), item.quantity + 1)
                                  }
                                  aria-label="Increase quantity"
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(cartLineKey(item))}
                                aria-label={`Remove ${item.name}`}
                                className="text-sm font-semibold text-destructive hover:underline"
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
                  <Button size="lg" className="w-full sm:w-auto px-8" onClick={() => nextStep(1)}>
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}

            {step === 1 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold tracking-tight">Delivery Details</h2>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                  <form
                    id="details-form"
                    className="grid gap-6 sm:grid-cols-2"
                    onInvalidCapture={(e) => {
                      const target = e.target;
                      if (
                        !(target instanceof HTMLInputElement) &&
                        !(target instanceof HTMLSelectElement) &&
                        !(target instanceof HTMLTextAreaElement)
                      ) return;
                      trackFirstParty({
                        name: "checkout_validation_error",
                        path: "/checkout",
                        page_type: "checkout",
                        properties: {
                          category: validationCategoryFromFieldName(target.name),
                        },
                      });
                    }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      setCustomer(
                        Object.fromEntries(
                          new FormData(e.currentTarget)
                        ) as Record<string, string>
                      );
                      nextStep(2); // Move directly to Review step
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-bold">Full Name *</Label>
                      <Input id="name" name="name" required autoComplete="name" placeholder="John Doe" defaultValue={customer.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold">Email Address *</Label>
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
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="phone" className="text-sm font-bold">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="+92 300 1234567"
                        defaultValue={customer.phone}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address" className="text-sm font-bold">Street Address *</Label>
                      <Input
                        id="address"
                        name="address"
                        required
                        autoComplete="street-address"
                        placeholder="House / Building / Street details"
                        defaultValue={customer.address}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-bold">City *</Label>
                      <Input id="city" name="city" required autoComplete="address-level2" defaultValue={customer.city} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal" className="text-sm font-bold">Postal Code</Label>
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
                
                <div className="mt-8 flex items-center justify-between">
                  <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Cart
                  </Button>
                  <Button size="lg" form="details-form" type="submit" className="px-8">
                    Continue to Review <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="flex flex-col gap-6">
                
                {/* 1. Shipping Information Card */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                     <h3 className="font-bold text-foreground text-[15px]">Shipping Information</h3>
                     <button onClick={() => setStep(1)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-foreground/80 space-y-1">
                       <p className="font-bold text-foreground">{customer.name || "N/A"}</p>
                       <p>{customer.phone}</p>
                       <p>{customer.email}</p>
                       <div className="mt-3">
                         <p>{customer.address}</p>
                         <p>{customer.city}{customer.postal ? `, ${customer.postal}` : ""}</p>
                         <p>Pakistan</p>
                       </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                {/* 2. Shipping Method Card */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                     <h3 className="font-bold text-foreground text-[15px]">Shipping Method</h3>
                     <button className="text-xs font-bold text-primary hover:underline">Edit</button>
                  </div>
                  <label className="flex items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4 cursor-default">
                      <div className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground relative">
                         <Check className="h-3 w-3" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                         <p className="text-[13px] font-bold text-foreground">Standard Delivery (2-4 Working Days)</p>
                         <p className="text-xs text-muted-foreground mt-0.5">Free on orders over PKR {config.freeShippingThreshold.toLocaleString()}</p>
                      </div>
                      <span className="text-[13px] font-bold text-foreground">
                        {shippingLabel || "PKR 0"}
                      </span>
                  </label>
                </div>

                {/* 3. Payment Method Card */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                     <h3 className="font-bold text-foreground text-[15px]">Payment Method</h3>
                     <button className="text-xs font-bold text-primary hover:underline">Edit</button>
                  </div>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const selected = payment === method.id;
                      return (
                         <label key={method.id} className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'bg-white hover:bg-secondary/50'}`}>
                            <div className={`shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 ${selected ? 'border-primary bg-primary text-white' : 'border-border'}`}>
                               {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                            </div>
                            <method.icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`}/>
                            <div className="flex-1">
                              <p className="text-[13px] font-bold tracking-wide">{method.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{method.description}</p>
                            </div>
                         </label>
                      )
                    })}
                  </div>
                </div>

                {/* 4. Order Notes (Optional) */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                     <h3 className="font-bold text-foreground text-[15px]">Order Notes (Optional)</h3>
                     <button className="text-xs font-bold text-primary hover:underline">Edit</button>
                  </div>
                  <input
                     type="text"
                     placeholder="Leave a note for your order (e.g. gate code, special instructions)"
                     className="w-full rounded-md border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                     value={orderNotes}
                     onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>

                {/* 5. Items in Your Order View */}
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                     <h3 className="font-bold text-foreground text-[15px]">Items in Your Order ({items.length})</h3>
                     <button onClick={() => setStep(0)} className="text-xs font-bold text-primary hover:underline">Edit Cart</button>
                  </div>
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li key={cartLineKey(item)} className="py-4 flex gap-4 first:pt-0 last:pb-0">
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
                               <p className="text-[13px] font-bold text-foreground line-clamp-2">{item.name}</p>
                               <span className="text-[13px] font-bold shrink-0">{formatPrice(item.price)}</span>
                            </div>
                            {item.variantName && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.variantName}</p>
                            )}
                            <div className="mt-auto flex gap-4 text-xs font-medium text-muted-foreground items-center">
                               {item.price > 0 && <span className="text-primary font-bold">{formatPrice(item.price)}</span>}
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
                     <p className="font-bold text-[13px] text-foreground">Safe & Secure Checkout</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Your information is protected with 256-bit SSL encryption.</p>
                   </div>
                </div>
              </section>
            )}

          </div>

          {/* ── Order summary sidebar (Figma Matched) ────────────────────────── */}
          <aside className="w-full space-y-6 lg:sticky lg:top-8 lg:self-start">
             
             {/* Main Summary Block */}
             <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="text-[17px] font-bold text-foreground border-b pb-4 mb-4">Order Summary</h2>
                
                <div className="space-y-3 text-[13px] font-medium border-b pb-4 mb-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                    <span className="text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="font-bold text-foreground">{shippingLabel ?? "—"}</span>
                  </div>
                  {activePromo && (
                    <div className="flex font-semibold items-center justify-between text-[#13A387] py-2 border-b">
                      <span>Discount (Promo applied)</span>
                      <span className="font-bold">- {formatPrice(appliedDiscount)}</span>
                    </div>
                  )}
                  {giftWrap && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gift Wrap</span>
                      <span className="text-foreground font-bold">{formatPrice(GIFT_WRAP_FEE)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Total</h3>
                    <p className="text-[10px] text-muted-foreground">(Inclusive of all taxes)</p>
                  </div>
                  <span className="text-2xl font-black text-primary tracking-tight">
                    {formatPrice(total)}
                  </span>
                </div>

                {hasPromo && step === 2 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F0F7F6] border border-primary/20 p-3 text-xs font-bold text-primary">
                     <Banknote className="h-4 w-4 shrink-0" />
                     You will save {formatPrice(appliedDiscount)} on this order!
                  </div>
                )}
             </div>

             {/* Promo Code Entry */}
             {step === 2 && (
               <div className="rounded-2xl border bg-white p-5 shadow-sm">
                 <h3 className="text-[13px] font-bold text-foreground mb-3">Have a Promo Code?</h3>
                 <div className="flex items-center gap-2">
                    <Input
                       placeholder="Enter promo code"
                       value={promoInput}
                       onChange={(e) => setPromoInput(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                       className="h-10 grow"
                       disabled={activePromo?.loading}
                    />
                    <Button variant="default" onClick={handleApplyPromo} disabled={activePromo?.loading || !promoInput.trim()} className="h-10 px-5 font-bold shadow-sm">
                      {activePromo?.loading ? "Applying..." : "Apply"}
                    </Button>
                 </div>
                 {activePromo?.error && <p className="mt-2 text-xs font-semibold text-destructive">{activePromo.error}</p>}
                 {activePromo && !activePromo.error && (
                   <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                     <span className="text-xs font-bold text-primary">Applied: {activePromo.code}</span>
                     <button type="button" onClick={() => setActivePromo(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Remove</button>
                   </div>
                 )}
               </div>
             )}

             {/* Notice banner for changes */}
             {priceChanged && (
               <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-sm text-amber-800">
                 <div className="flex items-start gap-3">
                   <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                   <div>
                     <p className="font-semibold">Prices changed directly on server while processing.</p>
                     <p className="mt-1 text-xs">Your order summary updated. Please review before placing order again.</p>
                   </div>
                 </div>
               </div>
             )}

             {/* Sidebar Trust Badges & Submit Button only available on Step 2 Review */}
             {step === 2 && (
               <div className="rounded-2xl border bg-white p-6 shadow-sm">
                 <div className="space-y-4 border-b pb-6 mb-6">
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0 border">
                         <ShieldCheck className="w-4 h-4" />
                       </div>
                       <div>
                         <p className="text-[11px] font-bold uppercase text-foreground">1 Year Warranty</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">On all products</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0 border">
                         <RotateCcw className="w-4 h-4" />
                       </div>
                       <div>
                         <p className="text-[11px] font-bold uppercase text-foreground">7 Days Easy Returns</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">Hassle-free returns</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0 border">
                         <Banknote className="w-4 h-4" />
                       </div>
                       <div>
                         <p className="text-[11px] font-bold uppercase text-foreground">Cash on Delivery</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">Pay when you receive</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0 border">
                         <Lock className="w-4 h-4" />
                       </div>
                       <div>
                         <p className="text-[11px] font-bold uppercase text-foreground">Secure Payments</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">100% safe & secure</p>
                       </div>
                    </div>
                 </div>

                 <Button 
                   onClick={() => placeOrder()} 
                   disabled={placing || Boolean(placedOrder)}
                   className="w-full text-[15px] font-bold h-12 shadow-md gap-2"
                 >
                    {placing ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4 shrink-0" />}
                    {placing ? "Processing..." : "Place Order"}
                 </Button>

                 <p className="text-[10px] text-muted-foreground mt-4 text-center leading-relaxed">
                   By placing your order, you agree to our <br/>
                   <Link href="/terms" className="text-primary font-bold underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary font-bold underline">Privacy Policy</Link>.
                 </p>
               </div>
             )}

          </aside>
        </div>
      </div>

      {/* Footer Features (Identical to Figma Checkout End) */}
      <div className="border-t bg-white mt-12 mb-8 hidden md:block">
        <div className="container mx-auto max-w-6xl px-4 py-8 lg:px-8">
           <div className="grid grid-cols-4 gap-4">
             <div className="flex items-center gap-3">
               <Lock className="w-6 h-6 text-primary shrink-0" />
               <div>
                  <p className="text-xs font-bold text-foreground">Secure Checkout</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">256-bit SSL encrypted</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <Star className="w-6 h-6 text-primary shrink-0" fill="currentColor" />
               <div>
                  <p className="text-xs font-bold text-foreground">Trusted by Thousands</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">4.8/5 average rating</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <Truck className="w-6 h-6 text-primary shrink-0" />
               <div>
                  <p className="text-xs font-bold text-foreground">Fast & Reliable Delivery</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Across Pakistan</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <Headphones className="w-6 h-6 text-primary shrink-0" />
               <div>
                  <p className="text-xs font-bold text-foreground">24/7 Customer Support</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">We&apos;re here to help</p>
               </div>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
}
