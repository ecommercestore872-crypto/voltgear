import { Banknote, Headset, PackageCheck, PackageSearch, RotateCcw, Truck } from "lucide-react";

export type TrustItem = {
  key: string;
  title: string;
  detail: string;
  icon: "cod" | "shipping" | "returns" | "curated" | "tracking" | "support";
};

const icons = {
  cod: Banknote,
  shipping: Truck,
  returns: RotateCcw,
  curated: PackageCheck,
  tracking: PackageSearch,
  support: Headset,
};

/** Display only benefits provided by the store settings. */
export function GadgetTrustStrip({
  items,
  headline = "",
  accent = "",
}: {
  items: TrustItem[];
  headline?: string;
  accent?: string;
}) {
  if (items.length === 0) return null;

  const lead = [headline.trim(), accent.trim()].filter(Boolean).join(" ");

  return (
    <section
      className="px-3 pb-2 pt-1 sm:px-5 lg:px-8"
      aria-label="Payment, shipping, and returns"
    >
      <div className="mx-auto max-w-[80rem] rounded-[1.5rem] bg-white px-2 py-4 sm:px-4">
        {lead ? (
          <p className="mb-3 px-2 text-center text-[12px] font-bold text-[var(--g-charcoal)] sm:text-left">
            {lead}
          </p>
        ) : null}
        <ul className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const Icon = icons[item.icon];
            return (
              <li
                key={item.key}
                className="flex min-w-[6.75rem] flex-1 snap-start flex-col items-center gap-1.5 px-2 text-center sm:min-w-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--g-line)] bg-white">
                  <Icon className="h-5 w-5 text-[var(--g-forest)]" strokeWidth={1.7} aria-hidden />
                </span>
                <p className="m-0 text-[11px] font-bold leading-tight text-[var(--g-charcoal)] sm:text-xs">{item.title}</p>
                {item.detail ? <p className="m-0 text-[10px] leading-snug text-[var(--g-taupe)] sm:text-[11px]">{item.detail}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
