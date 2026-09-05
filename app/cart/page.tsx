"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

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
        gadget ? "bg-[var(--g-cream-deep)]" : "bg-muted/60"
      )}
    >
      {remaining > 0 ? (
        <p className={cn("text-xs", gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground")}>
          You&rsquo;re{" "}
          <span className={cn("font-semibold", gadget ? "text-[var(--g-charcoal)]" : "text-foreground")}>
            {formatPrice(remaining)}
          </span>{" "}
          away from{" "}
          <span className={cn("font-semibold", gadget ? "text-[var(--g-charcoal)]" : "text-foreground")}>
            free shipping
          </span>
        </p>
      ) : (
        <p
          className={cn(
            "text-xs font-semibold",
            gadget ? "text-[var(--g-forest)]" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          You&rsquo;ve unlocked free shipping!
        </p>
      )}
      <div
        className={cn(
          "mt-2 h-2 overflow-hidden rounded-full",
          gadget ? "bg-[var(--g-line)]" : "bg-border"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            gadget ? "bg-[var(--g-forest)]" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const config = useSiteConfig();
  const gadget = useGadgetPreview();
  const shopHref = gadget ? products2Href() : "/products";
  const productHref = (slug: string) =>
    gadget ? product2Href(slug) : `/product/${slug}`;

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "container mx-auto max-w-3xl px-4 py-16 text-center lg:px-8",
          gadget && `gadget-theme ${gadgetFontClass} bg-[var(--g-cream)]`
        )}
      >
        <ShoppingBag
          className={cn(
            "mx-auto h-16 w-16",
            gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"
          )}
        />
        <h1
          className={cn(
            "mt-4 text-2xl font-bold",
            gadget && "gadget-display font-semibold tracking-[-0.03em]"
          )}
        >
          Your cart is empty
        </h1>
        <p className={cn("mt-2", gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground")}>
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
        "container mx-auto max-w-5xl px-4 py-8 lg:px-8",
        gadget && `gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`
      )}
    >
      <Link
        href={shopHref}
        className={cn(
          "mb-6 inline-flex items-center gap-1 text-sm transition-colors",
          gadget
            ? "text-[var(--g-taupe)] hover:text-[var(--g-forest)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ChevronLeft className="h-4 w-4" /> Continue Shopping
      </Link>

      <h1
        className={cn(
          "text-2xl font-bold tracking-tight sm:text-3xl",
          gadget && "gadget-display font-semibold tracking-[-0.03em]"
        )}
      >
        Shopping cart
      </h1>
      <p className={cn("mt-1", gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground")}>
        {items.length} item(s) in your cart
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={cartLineKey(item)}
              className={cn(
                "flex gap-4 rounded-xl border p-4",
                gadget
                  ? "border-[var(--g-line)] bg-[var(--g-white)]"
                  : "bg-card"
              )}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={120}
                  height={120}
                  className={cn(
                    "h-24 w-24 rounded-lg border object-cover sm:h-28 sm:w-28",
                    gadget ? "border-[var(--g-line)] bg-[var(--g-cream-deep)]" : "bg-muted"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "h-24 w-24 rounded-lg border sm:h-28 sm:w-28",
                    gadget ? "border-[var(--g-line)] bg-[var(--g-cream-deep)]" : "bg-muted"
                  )}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={productHref(item.slug)}
                    className={cn(
                      "font-medium transition-colors",
                      gadget ? "hover:text-[var(--g-forest)]" : "hover:text-primary"
                    )}
                  >
                    {item.name}
                  </Link>
                  {item.variantName ? (
                    <p
                      className={cn(
                        "text-sm",
                        gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"
                      )}
                    >
                      {item.variantName}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm font-semibold">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1",
                      gadget && "border-[var(--g-line)]"
                    )}
                  >
                    <button
                      onClick={() =>
                        updateQuantity(cartLineKey(item), Math.max(1, item.quantity - 1))
                      }
                      className={gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground hover:text-foreground"}
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(cartLineKey(item), item.quantity + 1)}
                      className={gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground hover:text-foreground"}
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
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
          className={cn(
            "h-fit min-w-0 rounded-2xl border p-4 sm:p-6 lg:sticky lg:top-24",
            gadget ? "border-[var(--g-line)] bg-[var(--g-white)]" : "bg-card"
          )}
        >
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-3">
            <FreeShippingBar
              subtotal={subtotal}
              threshold={config.freeShippingThreshold}
              gadget={gadget}
            />
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"}>
                Subtotal
              </span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className={gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground"}>
                Shipping
              </span>
              <span>
                {subtotal >= config.freeShippingThreshold
                  ? "Free"
                  : formatPrice(config.shippingFee)}
              </span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>
              {formatPrice(
                subtotal >= config.freeShippingThreshold
                  ? subtotal
                  : subtotal + config.shippingFee
              )}
            </span>
          </div>
          {gadget ? (
            <Link
              href={checkoutHref(true)}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--g-forest)] text-sm font-semibold text-[var(--g-white)] hover:bg-[var(--g-forest-mid)]"
            >
              Proceed to checkout
            </Link>
          ) : (
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href={checkoutHref(false)}>Proceed to Checkout</Link>
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
