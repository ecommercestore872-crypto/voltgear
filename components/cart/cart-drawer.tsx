"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Banknote,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { formatPrice, cn } from "@/lib/utils";
import { useCart, cartLineKey } from "@/components/cart/cart-provider";
import { useSiteConfig } from "@/lib/use-site-config";
import { CartUpsell } from "@/components/cart/cart-upsell";
import {
  isGadgetPreviewPath,
  products2Href,
  checkoutHref,
  readGadgetPreviewSession,
  shouldUseGadgetChrome,
} from "@/lib/gadget-preview";

function ConfirmRemoveDialog({
  open,
  itemName,
  gadget,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  itemName: string;
  gadget: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150",
          gadget
            ? "gadget-theme border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)]"
            : "border bg-background"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              gadget ? "bg-[var(--g-cream-deep)]" : "bg-amber-100 dark:bg-amber-900/30"
            )}
          >
            <AlertTriangle
              className={cn(
                "h-5 w-5",
                gadget ? "text-[var(--g-forest)]" : "text-amber-600 dark:text-amber-400"
              )}
            />
          </div>
          <div>
            <p className="font-semibold">Remove item?</p>
            <p className={cn("text-sm", gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground")}>
              It will be removed from your cart.
            </p>
          </div>
        </div>
        <p className={cn("mt-4 text-sm", gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground")}>
          Are you sure you want to remove{" "}
          <span className={cn("font-medium", gadget ? "text-[var(--g-charcoal)]" : "text-foreground")}>
            {itemName}
          </span>{" "}
          from your cart?
        </p>
        <div className="mt-5 flex gap-3">
          {gadget ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-[var(--g-line)] text-sm font-semibold"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--g-forest)] text-sm font-semibold text-[var(--g-white)]"
              >
                Yes, remove
              </button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Keep It
              </Button>
              <Button variant="destructive" className="flex-1" onClick={onConfirm}>
                Yes, Remove
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function FreeShippingBar({
  subtotal,
  threshold,
  gadget,
}: {
  subtotal: number;
  threshold: number;
  gadget: boolean;
}) {
  if (threshold <= 0) return null;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);

  if (gadget) {
    return (
      <div className="rounded-xl border border-[var(--g-line)] bg-[var(--g-white)] p-2.5">
        <div className="flex items-center justify-between text-[11px]">
          {remaining > 0 ? (
            <p className="text-[var(--g-taupe)]">
              <span className="font-semibold text-[var(--g-charcoal)]">{formatPrice(remaining)}</span> away from <span className="font-semibold text-[var(--g-forest)]">free shipping</span>
            </p>
          ) : (
            <p className="font-semibold text-[var(--g-forest)]">
              Free shipping unlocked
            </p>
          )}
          <span className="font-semibold tabular-nums text-[10px] text-[var(--g-taupe)]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--g-cream-deep)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--g-sage)] to-[var(--g-forest)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-muted/60 p-4">
      {remaining > 0 ? (
        <p className="text-xs text-muted-foreground">
          You&rsquo;re <span className="font-semibold text-foreground">{formatPrice(remaining)}</span>{" "}
          away from <span className="font-semibold text-foreground">free shipping</span>
        </p>
      ) : (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          You&rsquo;ve unlocked free shipping!
        </p>
      )}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessionActive, setSessionActive] = useState(false);
  useEffect(() => {
    setSessionActive(readGadgetPreviewSession());
  }, [pathname, searchParams]);
  const gadget = shouldUseGadgetChrome(pathname || "", {
    search: searchParams?.toString() ?? "",
    sessionActive: sessionActive || isGadgetPreviewPath(pathname || ""),
  });
  const shopHref = gadget ? products2Href() : "/products";
  const { items, isOpen, closeCart, subtotal, updateQuantity, removeItem, clearCart } =
    useCart();
  const config = useSiteConfig();
  const [orderNote, setOrderNote] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const confirmItem = confirmKey ? items.find((i) => cartLineKey(i) === confirmKey) : null;

  function requestRemove(key: string) {
    closeCart();
    setConfirmKey(key);
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => (open ? null : closeCart())}>
        <SheetContent
          className={cn(
            "flex h-dvh max-h-dvh w-full flex-col overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:max-w-md sm:p-6",
            gadget &&
              "gadget-theme border-l border-[var(--g-line)] bg-[var(--g-cream)] text-[var(--g-charcoal)]"
          )}
        >
          <SheetHeader>
            <SheetTitle
              className={cn(
                "flex items-center gap-2",
                gadget && "font-semibold text-[var(--g-charcoal)]"
              )}
            >
              <ShoppingBag className="h-5 w-5" />
              Your Cart ({items.length})
            </SheetTitle>
          </SheetHeader>

          <div className="gadget-custom-scroll flex-1 overflow-y-auto overflow-x-hidden py-4 pr-3">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full",
                    gadget ? "bg-[var(--g-cream-deep)] text-[var(--g-forest)]" : "text-muted-foreground"
                  )}
                >
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div>
                  <p className={cn("font-semibold", gadget ? "text-[var(--g-charcoal)]" : "")}>
                    Your cart is empty
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm",
                      gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"
                    )}
                  >
                    Add something you love — COD available at checkout.
                  </p>
                </div>
                <Link
                  href={shopHref}
                  onClick={closeCart}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold",
                    gadget
                      ? "bg-[var(--g-forest)] text-[var(--g-white)]"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  Start shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={cartLineKey(item)} className={cn("flex gap-4 p-3 rounded-2xl border", gadget ? "bg-[var(--g-white)] border-[var(--g-line)] shadow-sm" : "bg-card border-border")}>
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          className={cn(
                            "h-16 w-16 rounded-xl border object-cover",
                            gadget
                              ? "border-[var(--g-line)] bg-[var(--g-white)]"
                              : "border bg-muted"
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "h-16 w-16 rounded-xl border",
                            gadget ? "border-[var(--g-line)] bg-[var(--g-white)]" : "bg-muted"
                          )}
                        />
                      )}
                      <div className="flex flex-1 min-w-0 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-snug text-[var(--g-charcoal)] truncate">
                              {item.name}
                            </p>
                            {item.variantName ? (
                              <span className="block text-[11px] font-normal text-[var(--g-taupe)] truncate">
                                {item.variantName}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => requestRemove(cartLineKey(item))}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                              gadget
                                ? "text-[var(--g-taupe)] hover:bg-[var(--g-cream-deep)] hover:text-red-600"
                                : "text-muted-foreground hover:text-destructive"
                            )}
                            aria-label={`Remove ${item.name}${item.variantName ? ` ${item.variantName}` : ""}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            {gadget ? (
                              <>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] transition active:scale-95"
                                  onClick={() =>
                                    updateQuantity(cartLineKey(item), item.quantity - 1)
                                  }
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-xs font-semibold tabular-nums text-[var(--g-charcoal)]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] transition active:scale-95"
                                  onClick={() =>
                                    updateQuantity(cartLineKey(item), item.quantity + 1)
                                  }
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    updateQuantity(cartLineKey(item), item.quantity - 1)
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-5 text-center text-xs">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    updateQuantity(cartLineKey(item), item.quantity + 1)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          <p className="text-xs font-bold tabular-nums text-[var(--g-charcoal)]">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <CartUpsell excludeSlugs={items.map((i) => i.slug)} />
              </>
            )}
          </div>

          {items.length > 0 ? (
            <>
              <Separator className={gadget ? "bg-[var(--g-line)]" : undefined} />
              <div className="space-y-3 pt-3">
                <FreeShippingBar
                  subtotal={subtotal}
                  threshold={config.freeShippingThreshold}
                  gadget={gadget}
                />

                <div className="flex items-center justify-between gap-2">
                  {gadget && config.codEnabled ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-[var(--g-taupe)]">
                      <Banknote className="h-3.5 w-3.5 text-[var(--g-forest)]" aria-hidden />
                      COD at checkout
                    </p>
                  ) : <span />}
                  
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("order-note-container");
                      if (el) el.classList.toggle("hidden");
                    }}
                    className="text-[11px] font-medium text-[var(--g-forest)] hover:underline"
                  >
                    + Add note
                  </button>
                </div>

                <div id="order-note-container" className="hidden">
                  <input
                    id="order-note"
                    type="text"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Special instructions..."
                    className={cn(
                      "w-full rounded-lg border px-3 py-1.5 text-xs outline-none",
                      gadget
                        ? "border-[var(--g-line)] bg-[var(--g-white)] placeholder:text-[var(--g-taupe)] focus:border-[var(--g-forest)]"
                        : "bg-muted/50 placeholder:text-muted-foreground focus:border-primary focus:bg-background"
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"
                    )}
                  >
                    Subtotal
                  </span>
                  <span className="gadget-display text-base font-bold tabular-nums text-[var(--g-charcoal)]">{formatPrice(subtotal)}</span>
                </div>
                {gadget ? (
                  <div className="space-y-2">
                    <Link
                      href={checkoutHref(gadget)}
                      onClick={closeCart}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--g-forest)] text-xs font-bold text-[var(--g-white)] shadow-[0_6px_16px_rgba(31,54,38,0.2)] transition hover:bg-[var(--g-forest-mid)] active:scale-[0.99]"
                    >
                      Checkout
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <div className="flex items-center justify-between px-1 text-xs">
                      <Link
                        href={shopHref}
                        onClick={closeCart}
                        className="text-[11px] font-medium text-[var(--g-taupe)] transition hover:text-[var(--g-charcoal)] hover:underline"
                      >
                        Continue shopping
                      </Link>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-[var(--g-taupe)] transition hover:text-red-600 hover:underline"
                        onClick={clearCart}
                      >
                        Clear cart
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button className="w-full" size="lg" asChild>
                      <Link href={checkoutHref(false)} onClick={closeCart}>
                        Proceed to Checkout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/cart" onClick={closeCart}>
                        View Cart
                      </Link>
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={clearCart}>
                      Clear Cart
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmRemoveDialog
        open={!!confirmKey}
        itemName={confirmItem?.name ?? ""}
        gadget={gadget}
        onConfirm={() => {
          if (confirmKey) removeItem(confirmKey);
          setConfirmKey(null);
        }}
        onCancel={() => setConfirmKey(null)}
      />
    </>
  );
}
