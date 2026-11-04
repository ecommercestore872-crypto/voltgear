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
      className="border-y border-[var(--g-line)] bg-[var(--g-sand)] px-4 py-3 sm:px-6 lg:px-8"
      aria-label="Payment, shipping, and returns"
    >
      <div className="mx-auto max-w-[80rem]">
        {lead ? (
          <p className="mb-2 text-center text-[12px] font-semibold text-[var(--g-forest)] sm:text-left">
            {lead}
          </p>
        ) : null}
        <ul className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const Icon = icons[item.icon];
            return (
              <li key={item.key} className="flex min-w-[10rem] flex-1 snap-start items-center gap-2.5 border-r border-[var(--g-line)] px-4 py-2 first:pl-1 last:border-r-0 sm:min-w-0 sm:justify-center sm:px-5">
                <Icon className="h-5 w-5 shrink-0 text-[var(--g-forest)]" strokeWidth={1.7} aria-hidden />
                <div>
                  <p className="m-0 text-xs font-bold text-[var(--g-forest)] sm:text-sm">{item.title}</p>
                  {item.detail ? <p className="m-0 mt-1 text-[11px] leading-snug text-[var(--g-taupe)] sm:text-xs">{item.detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
