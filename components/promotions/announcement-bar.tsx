import { SHOPPER_BRAND } from "@/lib/brand";

export function StorefrontAnnouncementBar() {
  return (
    <div className="bg-[var(--g-forest)] py-2 px-3 text-xs font-medium text-[var(--g-cream)]">
      <p className="mx-auto max-w-7xl text-center text-[11px] sm:text-xs">
        <span className="font-semibold text-[color-mix(in_srgb,var(--g-terracotta)_70%,white)]">
          {SHOPPER_BRAND.tagline}
        </span>{" "}
        <span className="text-[var(--g-cream)]/90">Cash on delivery · try it at home</span>
      </p>
    </div>
  );
}
