import { SHOPPER_BRAND } from "@/lib/brand";
import { GeoDeliveryBanner } from "./geo-delivery-banner";

export function StorefrontAnnouncementBar({ tagline }: { tagline?: string }) {
  return (
    <div className="gadget-announce-premium h-9 min-h-[36px] max-h-9 flex items-center justify-center px-3 text-xs font-medium text-[var(--g-cream)] md:hidden overflow-hidden">
      <p className="mx-auto max-w-7xl overflow-hidden text-center text-[11px] sm:text-xs leading-none flex items-center justify-center gap-1">
        <span className="block truncate font-semibold text-[var(--g-cream)] sm:inline">
          {tagline || SHOPPER_BRAND.tagline}
        </span>
        <span className="hidden sm:inline text-[var(--g-cream)]/60 mx-2">
          ·
        </span>
        <GeoDeliveryBanner />
      </p>
    </div>
  );
}
