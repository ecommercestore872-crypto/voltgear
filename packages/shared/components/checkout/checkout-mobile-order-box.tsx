"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { Banknote, Loader2, Lock } from "lucide-react";

import { cartLineKey, type CartItem } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckoutSummaryPriceRow } from "@/components/checkout/checkout-summary-price-row";
import { cn, formatPrice } from "@/lib/utils";

export type CheckoutMobileOrderBoxProps = {
  items: CartItem[];
  productHref: (slug: string) => string;
  subtotal: number;
  dealDiscount: number;
  dealTitle?: string;
  shippingLabel: string | null;
  appliedDiscount: number;
  giftWrap: boolean;
  giftWrapFee: number;
  total: number;
  hasPromo: boolean;
  placing: boolean;
  promoInput: string;
  onPromoInputChange: (value: string) => void;
  onApplyPromo: () => void;
  promoLoading?: boolean;
  promoError?: string;
  promoCode?: string;
  onRemovePromo: () => void;
  className?: string;
};

function lineItemImageSrc(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (typeof window !== "undefined" && src.startsWith("/")) {
    return `${window.location.origin}${src}`;
  }
  return src;
}

export const CheckoutMobileOrderBox = forwardRef<
  HTMLDivElement,
  CheckoutMobileOrderBoxProps
>(function CheckoutMobileOrderBox(
  {
    items,
    productHref,
    subtotal,
    dealDiscount,
    dealTitle,
    shippingLabel,
    appliedDiscount,
    giftWrap,
    giftWrapFee,
    total,
    hasPromo,
    placing,
    promoInput,
    onPromoInputChange,
    onApplyPromo,
    promoLoading,
    promoError,
    promoCode,
    onRemovePromo,
    className,
  },
  ref,
) {
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div
      ref={ref}
      id="checkout-order-box"
      className={cn(
        "premium-royal-surface scroll-mt-4 rounded-xl border-0 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--g-line)] pb-3">
        <h2 className="gadget-display relative z-[2] text-base font-bold text-foreground">
          Your order
        </h2>
        <Link
          href="/cart"
          className="shrink-0 text-xs font-bold text-primary underline-offset-2 hover:underline"
        >
          Edit cart
        </Link>
      </div>

      <ul className="max-h-52 space-y-3 overflow-y-auto overscroll-contain border-b border-[var(--g-line)] pb-3">
        {items.map((item) => (
          <li key={cartLineKey(item)} className="flex gap-3">
            {item.image ? (
              // Plain img — cart URLs may be relative or off CDN patterns; must not break checkout.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lineItemImageSrc(item.image)}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 shrink-0 rounded-lg border border-[var(--g-line)] bg-muted object-cover"
              />
            ) : (
              <div
                className="h-14 w-14 shrink-0 rounded-lg border border-[var(--g-line)] bg-muted"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={productHref(item.slug)}
                className="line-clamp-2 text-sm font-semibold leading-snug text-foreground hover:text-primary"
              >
                {item.name}
              </Link>
              {item.variantName ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.variantName}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">Qty {item.quantity}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-2 border-b border-[var(--g-line)] pb-3">
        <CheckoutSummaryPriceRow
          label={`Subtotal (${itemCount} items)`}
          value={formatPrice(subtotal)}
        />
        {dealDiscount > 0 ? (
          <CheckoutSummaryPriceRow
            tone="deal"
            label={
              <>
                Pair deal
                {dealTitle ? (
                  <span className="font-medium"> · {dealTitle}</span>
                ) : null}
              </>
            }
            value={`− ${formatPrice(dealDiscount)}`}
          />
        ) : null}
        <CheckoutSummaryPriceRow label="Delivery" value={shippingLabel ?? "—"} />
        {hasPromo && appliedDiscount > 0 ? (
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
            value={formatPrice(giftWrapFee)}
          />
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Total · pay on delivery</p>
          <p className="text-[10px] text-muted-foreground">All taxes included</p>
        </div>
        <span className="text-2xl font-black tabular-nums text-primary">
          {formatPrice(total)}
        </span>
      </div>

      {hasPromo && appliedDiscount > 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-[var(--g-cream)] p-2.5 text-xs font-bold text-primary">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>You save {formatPrice(appliedDiscount)} on this order</span>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-[var(--g-line)] bg-[var(--g-cream-deep)]/40 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground">
          Promo code
        </h3>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Enter code"
            value={promoInput}
            onChange={(e) => onPromoInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyPromo()}
            className="h-11 min-w-0 flex-1 bg-card"
            disabled={promoLoading}
          />
          <Button
            type="button"
            onClick={onApplyPromo}
            disabled={promoLoading || !promoInput.trim()}
            className="h-11 shrink-0 px-5 font-bold"
          >
            {promoLoading ? "…" : "Apply"}
          </Button>
        </div>
        {promoError ? (
          <p className="mt-2 text-xs font-semibold text-destructive">{promoError}</p>
        ) : null}
        {promoCode && !promoError ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs">
            <span className="truncate font-bold text-primary">Applied: {promoCode}</span>
            <button
              type="button"
              onClick={onRemovePromo}
              className="shrink-0 font-semibold text-muted-foreground"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <Button
        form="details-form"
        type="submit"
        disabled={placing}
        className="relative z-[2] mt-4 h-12 w-full gap-2 border border-[var(--g-gold,#c9a227)]/30 text-base font-bold shadow-md"
      >
        {placing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4 shrink-0" />
        )}
        {placing ? "Processing…" : "Place order"}
      </Button>

      <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        By placing your order, you agree to our{" "}
        <Link href="/terms-of-service" className="font-bold text-primary underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="font-bold text-primary underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
});
