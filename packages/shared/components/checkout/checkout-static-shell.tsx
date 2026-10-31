import { Banknote, ShieldCheck, Truck } from "lucide-react";

import { StorefrontLink as Link } from "@/components/navigation/storefront-link";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import { normalizeSettings } from "@/lib/site-config";
import { formatPrice } from "@/lib/utils";

/** Server-rendered trust content for checkout (visible before client bundle hydrates). */
export async function CheckoutStaticShell() {
  const settings = await loadStorefrontSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const threshold = Number(config.freeShippingThreshold ?? 0);

  return (
    <div className="border-b border-[var(--g-line)] bg-[var(--g-cream)]">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g-forest)]">
          Cash on delivery
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-[var(--g-charcoal)] lg:text-3xl">
          Checkout
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--g-taupe)]">
          Enter delivery details. Pay cash when your order arrives.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--g-charcoal)]/80 sm:text-sm">
          {config.codEnabled !== false ? (
            <li className="inline-flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-[var(--g-forest)]" aria-hidden />
              Cash on delivery
            </li>
          ) : null}
          <li className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-[var(--g-forest)]" aria-hidden />
            {threshold > 0
              ? `Free shipping over ${formatPrice(threshold)}`
              : "Nationwide delivery"}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--g-forest)]" aria-hidden />
            Inspect at the door
          </li>
        </ul>
        <p className="mt-2 text-xs text-[var(--g-taupe)]">
          <Link href="/shipping-returns" className="underline hover:text-[var(--g-forest)]">
            Shipping &amp; returns
          </Link>
          {" · "}
          <Link href="/privacy-policy" className="underline hover:text-[var(--g-forest)]">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}
