import { SHOPPER_BRAND } from "@/lib/brand";

export function StorefrontAnnouncementBar() {
  return (
    <div className="bg-[var(--g-forest)] py-2 px-3 text-xs font-medium text-[var(--g-cream)]">
      <p className="mx-auto max-w-7xl text-center text-[11px] sm:text-xs">
        <span className="font-semibold text-[var(--g-cream)]">
          {SHOPPER_BRAND.tagline}
        </span>{" "}
        <span className="text-[var(--g-cream)]">Cash on delivery · try it at home</span>
      </p>
    </div>
  );
}
