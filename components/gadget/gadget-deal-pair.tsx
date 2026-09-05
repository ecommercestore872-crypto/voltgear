import Link from "next/link";

import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function GadgetDealPair({
  percentOff,
  other,
}: {
  percentOff: number;
  other: Product;
}) {
  return (
    <section className="mt-10 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--g-forest)]">
        Pair deal · {percentOff}% off the cheaper item
      </p>
      <h2 className="gadget-display mt-1 text-xl font-semibold">Buy together</h2>
      <p className="mt-1 text-sm text-[var(--g-taupe)]">
        Add this with your item. The percent comes off the cheaper product only — a cheap add-on
        cannot cut an expensive one.
      </p>
      <div className="mt-4 max-w-xs">
        <GadgetProductCard product={other} />
      </div>
      <p className="mt-3 text-sm text-[var(--g-charcoal)]">
        Pair from {formatPrice(other.price)} ·{" "}
        <Link href={`/product/${other.slug}`} className="text-[var(--g-forest)] underline-offset-2 hover:underline">
          View {other.name}
        </Link>
      </p>
    </section>
  );
}
