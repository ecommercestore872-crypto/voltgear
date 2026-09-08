import { SHOPPER_BRAND } from "@/lib/brand";
import { GeoDeliveryBanner } from "./geo-delivery-banner";

export function StorefrontAnnouncementBar() {
  return (
    <div className="bg-[var(--g-forest)] py-2 px-3 text-xs font-medium text-[var(--g-cream)]">
      <p className="mx-auto max-w-7xl overflow-hidden text-center text-[11px] sm:text-xs">
        <span className="block truncate font-semibold text-[var(--g-cream)] sm:inline">
          {SHOPPER_BRAND.tagline}
        </span>
        <span className="hidden sm:inline text-[var(--g-cream)]/60 mx-2">·</span>
        <GeoDeliveryBanner />
      </p>
    </div>
  );
}
