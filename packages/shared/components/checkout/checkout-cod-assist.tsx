"use client";

import Link from "next/link";
import { Banknote, Truck } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/social-icons";
import { shopWhatsAppHref } from "@/lib/contact-links";
import { formatPrice } from "@/lib/utils";
export function CheckoutCodAssist({
  freeShippingThreshold,
  shippingFee,
  whatsappNumber,
  supportPhone,
}: {
  freeShippingThreshold: number;
  shippingFee: number;
  whatsappNumber?: string | null;
  supportPhone?: string | null;
}) {
  const whatsapp = shopWhatsAppHref({
    whatsappNumber,
    phone: supportPhone,
  });
  const freeOver =
    freeShippingThreshold > 0
      ? `Free delivery on orders over ${formatPrice(freeShippingThreshold)}`
      : null;
  const shippingLine =
    shippingFee > 0
      ? `Standard delivery ${formatPrice(shippingFee)}`
      : "Delivery fee shown in summary";

  return (
    <div className="mb-6 grid gap-3 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="space-y-2 text-sm text-[var(--g-charcoal)]">
        <p className="flex items-center gap-2 font-semibold text-[var(--g-forest)]">
          <Banknote className="h-4 w-4 shrink-0" aria-hidden />
          Cash on delivery — pay when your parcel arrives
        </p>
        <p className="flex items-start gap-2 text-[var(--g-taupe)]">
          <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {freeOver ? (
              <>
                {freeOver}. {shippingLine}.
              </>
            ) : (
              shippingLine
            )}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Only name, mobile, and address are required. Email and city are optional.
        </p>
      </div>
      {whatsapp ? (
        <Link
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--g-line)] bg-[var(--g-cream)] px-4 text-sm font-bold text-[var(--g-forest)] transition-colors hover:bg-[var(--g-white)]"
        >
          <WhatsAppIcon className="h-5 w-5" aria-hidden />
          WhatsApp help
        </Link>
      ) : null}
    </div>
  );
}
