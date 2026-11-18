import { Banknote, Truck } from "lucide-react";

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
    <div className="px-2 pt-2 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[1.5rem] bg-white px-4 py-4 sm:px-6 sm:py-5">
        <p className="gadget-eyebrow">
          Cash on delivery
        </p>
        <h1 className="mt-1 login-section-title text-2xl lg:text-3xl">
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
              : "Shipping shown at checkout"}
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
