import { GadgetTrustStrip, type TrustItem } from "@/components/gadget/gadget-trust-strip";
import { normalizeHomeSections } from "@/lib/db/home-section-rules";
import { normalizeSettings } from "@/lib/site-config";
import type { SiteSettings } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

/** Lightweight, settings-backed benefits directly below the campaign hero. */
export function GadgetHomeTrust({ settings }: { settings: SiteSettings | null }) {
  const enabled = normalizeHomeSections(settings?.homeSections ?? null).some(
    (section) => section.id === "trust" && section.enabled,
  );
  if (!enabled) return null;

  const config = normalizeSettings(settings);
  const threshold = Number(config.freeShippingThreshold ?? 0);
  const items: TrustItem[] = [
    {
      key: "shipping",
      title: threshold > 0 ? "Free shipping" : "Shipping",
      detail: threshold > 0 ? `Over ${formatPrice(threshold)}` : "Shown at checkout",
      icon: "shipping",
    },
    ...(config.codEnabled
      ? [{ key: "cod", title: "Cash on delivery", detail: "Pay on arrival", icon: "cod" as const }]
      : []),
    {
      key: "tracking",
      title: "Order tracking",
      detail: "Follow your order online",
      icon: "tracking",
    },
  ];

  if (config.returnWindowDays) {
    items.push({
      key: "returns",
      title: "Returns",
      detail: `${config.returnWindowDays}-day window`,
      icon: "returns",
    });
  } else if (config.supportEmail || config.supportPhone) {
    items.push({
      key: "support",
      title: "Customer support",
      detail: "Contact our team",
      icon: "support",
    });
  }

  return (
    <GadgetTrustStrip
      items={items}
      headline={config.homeTrustHeadline ?? undefined}
      accent={config.homeTrustAccent ?? undefined}
    />
  );
}
