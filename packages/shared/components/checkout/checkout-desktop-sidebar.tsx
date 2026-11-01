import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { CheckoutSummaryPriceRow } from "@/components/checkout/checkout-summary-price-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";

const SUMMARY_CARD =
  "min-w-0 overflow-hidden rounded-xl border border-[var(--g-line)] bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5";

type ActivePromo = {
  code: string;
  discount: number;
  shipping: number;
  error?: string;
  loading?: boolean;
};

export function CheckoutDesktopSidebar({
  step,
  itemCount,
  subtotal,
  dealDiscount,
  dealTitle,
  shippingLabel,
  activePromo,
  hasPromo,
  appliedDiscount,
  giftWrap,
  giftWrapFee,
  total,
  promoInput,
  placing,
  priceChanged,
  warrantyMonths,
  returnWindowDays,
  onPromoInputChange,
  onApplyPromo,
  onRemovePromo,
  onContinueShopping,
}: {
  step: number;
  itemCount: number;
  subtotal: number;
  dealDiscount: number;
  dealTitle?: string;
  shippingLabel?: string | null;
  activePromo: ActivePromo | null;
  hasPromo: boolean;
  appliedDiscount: number;
  giftWrap: boolean;
  giftWrapFee: number;
  total: number;
  promoInput: string;
  placing: boolean;
  priceChanged: boolean;
  warrantyMonths?: number | null;
  returnWindowDays?: number | null;
  onPromoInputChange: (value: string) => void;
  onApplyPromo: () => void | Promise<void>;
  onRemovePromo: () => void;
  onContinueShopping: () => void;
}) {
  return (
    <aside className="order-2 hidden w-full space-y-3 lg:block lg:order-none lg:sticky lg:top-8 lg:self-start lg:space-y-5">
      <div className={cn(SUMMARY_CARD, "p-3 sm:p-4 lg:p-5")}>
        <h2 className="mb-2 border-b border-[var(--g-line)] pb-2 text-sm font-bold text-foreground sm:mb-3 sm:pb-3 sm:text-base lg:text-[17px]">
          Order summary
        </h2>

        <div className="space-y-2.5 border-b border-[var(--g-line)] pb-3.5 sm:space-y-3 sm:pb-4">
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
              value={formatPrice(giftWrapFee)}
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
              onChange={(event) => onPromoInputChange(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onApplyPromo()}
              className="h-11 min-w-0 flex-1"
              disabled={activePromo?.loading}
            />
            <Button
              variant="default"
              onClick={onApplyPromo}
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
                onClick={onRemovePromo}
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
              <p className="font-semibold">Prices updated while processing.</p>
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
              ...(warrantyMonths ? [{
                icon: ShieldCheck,
                title: `${warrantyMonths}-Month Warranty`,
                detail: "Guaranteed authentic",
              }] : []),
              ...(returnWindowDays ? [{
                icon: RotateCcw,
                title: `${returnWindowDays}-Day Easy Returns`,
                detail: "Hassle-free returns",
              }] : []),
              {
                icon: Banknote,
                title: "Cash on Delivery",
                detail: "Pay when you receive",
              },
              {
                icon: Lock,
                title: "Secure Checkout",
                detail: "Encrypted connection",
              },
            ].map((item) => (
              <div key={item.title} className="flex min-w-0 items-start gap-3">
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
              onClick={onContinueShopping}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Continue Shopping
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
