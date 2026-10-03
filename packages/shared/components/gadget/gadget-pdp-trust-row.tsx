import { Banknote, RefreshCw, ShieldCheck, Truck } from "lucide-react";

import type { PublicSiteConfig } from "@/lib/site-config";
import { warrantyLabel } from "@/lib/site-config";
import { formatPrice } from "@/lib/utils";

export function GadgetPdpTrustRow({ config }: { config: PublicSiteConfig }) {
  const threshold = Number(config.freeShippingThreshold ?? 0);
  const items = [
    config.codEnabled
      ? { icon: Banknote, label: "Cash on delivery" }
      : null,
    {
      icon: Truck,
      label:
        threshold > 0
          ? `Free shipping over ${formatPrice(threshold)}`
          : "Delivery across Pakistan",
    },
    config.warrantyMonths
      ? { icon: ShieldCheck, label: warrantyLabel(config.warrantyMonths) }
      : null,
    config.returnWindowDays
      ? { icon: RefreshCw, label: `${config.returnWindowDays}-day returns` }
      : null,
  ].filter(Boolean) as { icon: typeof Banknote; label: string }[];

  if (!items.length) return null;

  return (
    <ul className="mt-4 grid grid-cols-2 gap-2">
      {items.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-xl border border-[var(--g-line)]/80 bg-[var(--g-cream-deep)] px-2.5 py-2 text-[13px] font-medium leading-snug text-[var(--g-charcoal)]"
        >
          <Icon
            className="h-4 w-4 shrink-0 text-[var(--g-forest)]"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="min-w-0">{label}</span>
        </li>
      ))}
    </ul>
  );
}
