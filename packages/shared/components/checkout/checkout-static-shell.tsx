import Link from "next/link";
import { Banknote, ShieldCheck, Truck } from "lucide-react";

import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import { normalizeSettings } from "@/lib/site-config";
import { formatPrice } from "@/lib/utils";

/** Server-rendered trust content for checkout (visible before client bundle hydrates). */
export async function CheckoutStaticShell() {
  const settings = await loadStorefrontSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const threshold = Number(config.freeShippingThreshold ?? 0);

  return (
    <div className="border-b border-[var(--g-line)] bg-[var(--g-cream-deep)]">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:py-5 lg:px-8 lg:py-6">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--g-charcoal)] sm:text-2xl lg:text-3xl">
          <span className="sm:hidden">Your delivery details</span>
          <span className="hidden sm:inline">Checkout — cash on delivery</span>
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-snug text-[var(--g-taupe)] sm:text-sm">
          <span className="sm:hidden">Name, mobile &amp; address — pay when your order arrives.</span>
          <span className="hidden sm:inline">Enter your details below. Pay when your order arrives.</span>
        </p>
        <ul className="mt-2 hidden flex-wrap gap-2 text-xs text-[var(--g-charcoal)] sm:flex sm:mt-4 sm:gap-3 sm:text-sm">
          {config.codEnabled !== false ? (
            <li className="inline-flex items-center gap-2 rounded-full bg-[var(--g-white)] px-3 py-1.5 shadow-sm">
              <Banknote className="h-4 w-4 text-[var(--g-forest)]" aria-hidden />
              Cash on delivery
            </li>
          ) : null}
          <li className="inline-flex items-center gap-2 rounded-full bg-[var(--g-white)] px-3 py-1.5 shadow-sm">
            <Truck className="h-4 w-4 text-[var(--g-forest)]" aria-hidden />
            {threshold > 0
              ? `Free shipping over ${formatPrice(threshold)}`
              : "Nationwide delivery"}
          </li>
          <li className="inline-flex items-center gap-2 rounded-full bg-[var(--g-white)] px-3 py-1.5 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-[var(--g-forest)]" aria-hidden />
            Secure checkout
          </li>
        </ul>
        <p className="mt-2 hidden text-xs text-[var(--g-taupe)] sm:block">
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
