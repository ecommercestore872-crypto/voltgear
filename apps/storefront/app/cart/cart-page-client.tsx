"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart, cartLineKey } from "@/components/cart/cart-provider";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { useGadgetPreview } from "@/components/gadget/use-gadget-preview";
import {
  checkoutHref,
  product2Href,
  products2Href,
} from "@/lib/gadget-preview";
import { useSiteConfig } from "@/lib/use-site-config";
import { FunnelTrustStrip } from "@/components/checkout/funnel-trust-strip";
import { cn, formatPrice } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "rounded-xl p-4",
        gadget ? "bg-[var(--g-cream-deep)]" : "bg-muted/60",
      )}
    >
      {remaining > 0 ? (
        <p
          className={cn(
            "text-xs",
            gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
          )}
        >
          You&rsquo;re{" "}
          <span
            className={cn(
              "font-semibold",
              gadget ? "text-[var(--g-charcoal)]" : "text-foreground",
            )}
          >
            {formatPrice(remaining)}
          </span>{" "}
          away from{" "}
          <span
            className={cn(
              "font-semibold",
              gadget ? "text-[var(--g-charcoal)]" : "text-foreground",
            )}
          >
            free shipping
          </span>
        </p>
      ) : (
        <p
          className={cn(
            "text-xs font-semibold",
            gadget
              ? "text-[var(--g-forest)]"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          You&rsquo;ve unlocked free shipping!
        </p>
      )}
      <div
        className={cn(
          "mt-2 h-2 overflow-hidden rounded-full",
          gadget ? "bg-[var(--g-line)]" : "bg-border",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            gadget ? "bg-[var(--g-forest)]" : "bg-primary",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function CartPageClient() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const config = useSiteConfig();
  const gadget = useGadgetPreview();
  const shopHref = gadget ? products2Href() : "/products";
  const productHref = (slug: string) =>
    gadget ? product2Href(slug) : `/product/${slug}`;

  const shippingFee = Number(config.shippingFee ?? 0);
  const threshold = Number(config.freeShippingThreshold ?? 0);
  const shipping =
    subtotal === 0 || subtotal >= threshold ? 0 : shippingFee;
  const orderTotal = subtotal + shipping;
  const checkoutLink = useMemo(() => checkoutHref(gadget), [gadget]);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "container mx-auto max-w-3xl px-4 py-16 text-center lg:px-8",
          gadget && `gadget-theme ${gadgetFontClass} bg-[var(--g-cream)]`,
        )}
      >
        <ShoppingBag
          className={cn(
            "mx-auto h-16 w-16",
            gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
          )}
        />
        <h1
          className={cn(
            "mt-4 text-2xl font-bold",
            gadget && "gadget-display font-semibold tracking-[-0.03em]",
          )}
        >
          Your cart is empty
        </h1>
        <p
          className={cn(
            "mt-2",
            gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
          )}
        >
          Add some products to get started.
        </p>
        {gadget ? (
          <Link
            href={shopHref}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--g-forest)] px-6 text-sm font-semibold text-[var(--g-white)]"
          >
            Browse products
          </Link>
        ) : (
          <Button asChild className="mt-6">
            <Link href={shopHref}>Browse Products</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "premium-royal-page-bg min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8",
        gadget &&
          `gadget-theme ${gadgetFontClass} text-[var(--g-charcoal)]`,
      )}
    >
      <div className="container mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href={shopHref}
        className={cn(
          "mb-6 inline-flex items-center gap-1 text-sm transition-colors",
          gadget
            ? "text-[var(--g-taupe)] hover:text-[var(--g-forest)]"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ChevronLeft className="h-4 w-4" /> Continue Shopping
      </Link>

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--g-gold,#c9a227)]">
        Premium checkout next
      </p>
      <h1
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight sm:text-3xl",
          gadget && "gadget-display font-semibold tracking-[-0.03em]",
        )}
      >
        Shopping cart
      </h1>
      <p
        className={cn(
          "mt-1",
          gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
        )}
      >
        {items.length} item(s) in your cart
      </p>

      <FunnelTrustStrip className="premium-royal-enter mt-4" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={cartLineKey(item)}
              className="premium-royal-surface flex gap-4 rounded-xl border-0 p-4"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={120}
                  height={120}
                  className={cn(
                    "h-24 w-24 rounded-lg border object-cover sm:h-28 sm:w-28",
                    gadget
                      ? "border-[var(--g-line)] bg-[var(--g-cream-deep)]"
                      : "bg-muted",
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "h-24 w-24 rounded-lg border sm:h-28 sm:w-28",
                    gadget
                      ? "border-[var(--g-line)] bg-[var(--g-cream-deep)]"
                      : "bg-muted",
                  )}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={productHref(item.slug)}
                    className={cn(
                      "font-medium transition-colors",
                      gadget
                        ? "hover:text-[var(--g-forest)]"
                        : "hover:text-primary",
                    )}
                  >
                    {item.name}
                  </Link>
                  {item.variantName ? (
                    <p
                      className={cn(
                        "text-sm",
                        gadget
                          ? "text-[var(--g-taupe)]"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.variantName}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm font-semibold">
                    {formatPrice(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1",
                      gadget && "border-[var(--g-line)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          cartLineKey(item),
                          Math.max(1, item.quantity - 1),
                        )
                      }
                      className="touch-manipulation flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(cartLineKey(item), item.quantity + 1)
                      }
                      className="touch-manipulation flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(cartLineKey(item))}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside
          id="cart-order-summary"
          className="premium-royal-surface premium-royal-enter premium-royal-enter-delay-2 h-fit min-w-0 rounded-2xl border-0 p-4 sm:p-6 lg:sticky lg:top-24"
        >
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-3">
            <FreeShippingBar
              subtotal={subtotal}
              threshold={threshold}
              gadget={gadget}
            />
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span
                className={
                  gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"
                }
              >
                Subtotal
              </span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span
                className={
                  gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"
                }
              >
                Shipping
              </span>
              <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(orderTotal)}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Pay on delivery · secure checkout
          </p>
          {gadget ? (
            <Link
              href={checkoutLink}
              className="mt-6 hidden min-h-12 w-full items-center justify-center rounded-full bg-[var(--g-forest)] text-sm font-semibold text-[var(--g-white)] hover:bg-[var(--g-forest-mid)] lg:flex"
            >
              Proceed to checkout
            </Link>
          ) : (
            <Button asChild size="lg" className="mt-6 hidden w-full lg:flex">
              <Link href={checkoutLink}>Proceed to Checkout</Link>
            </Button>
          )}
        </aside>
      </div>

      <div className="premium-royal-dock touch-manipulation fixed inset-x-0 bottom-0 z-40 bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Total · COD
            </p>
            <p className="text-xl font-black tabular-nums text-primary">
              {formatPrice(orderTotal)}
            </p>
          </div>
          <Link
            href={checkoutLink}
            className="flex h-12 min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--g-forest)] text-base font-bold text-[var(--g-white)] shadow-md"
          >
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            Checkout
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
