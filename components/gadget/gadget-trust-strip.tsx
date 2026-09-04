import { BadgeCheck, Banknote, RefreshCw, Truck } from "lucide-react";

export type TrustItem = {
  key: string;
  title: string;
  detail: string;
  icon: "cod" | "shipping" | "returns" | "curated";
};

const ICONS = {
  cod: Banknote,
  shipping: Truck,
  returns: RefreshCw,
  curated: BadgeCheck,
} as const;

export function GadgetTrustStrip({
  items,
  headline = "Exceptional Quality",
  accent = "Delivered",
}: {
  items: TrustItem[];
  headline?: string;
  accent?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className="px-3 py-3 sm:px-4 sm:py-4 lg:px-8"
      aria-label="Why shop with us"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-3 rounded-[2rem] border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[color-mix(in_srgb,var(--g-blush)_55%,white)] px-5 py-3 shadow-[0_4px_16px_rgba(31,54,38,0.06)] backdrop-blur-md lg:flex-row lg:gap-6 lg:px-7 lg:py-3.5">
          {/* Left headline matching reference image */}
          <div className="shrink-0 text-center lg:text-left">
            <p className="text-sm font-bold text-[var(--g-charcoal)] sm:text-base lg:text-[15px]">
              {headline}{" "}
              <span className="text-[var(--g-amber-text)] font-extrabold">{accent}</span>
            </p>
          </div>

          {/* Right inline trust indicators */}
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:gap-5">
            {items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-center gap-2 p-1 lg:justify-start"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      item.icon === "cod"
                        ? "bg-[color-mix(in_srgb,var(--g-terracotta)_22%,var(--g-cream))] text-[var(--g-terracotta)]"
                        : item.icon === "shipping"
                          ? "bg-[color-mix(in_srgb,var(--g-sage)_22%,var(--g-cream))] text-[var(--g-forest)]"
                          : item.icon === "returns"
                            ? "bg-[color-mix(in_srgb,var(--g-leaf)_20%,var(--g-cream))] text-[var(--g-leaf)]"
                            : "bg-[color-mix(in_srgb,var(--g-forest)_14%,var(--g-cream))] text-[var(--g-forest)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 stroke-[1.6]" aria-hidden />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[11px] font-semibold leading-tight text-[var(--g-charcoal)] sm:text-[12px]">
                      {item.title}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[var(--g-taupe)]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
