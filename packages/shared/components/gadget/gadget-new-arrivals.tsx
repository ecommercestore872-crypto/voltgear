import Link from "next/link";

import { GadgetArrivalCard } from "@/components/gadget/gadget-arrival-card";
import { GadgetRailArrows } from "@/components/gadget/gadget-rail-arrows";
import type { Product } from "@/lib/types";

function TitleWithAccent({ title }: { title: string }) {
  const parts = title.trim().split(/\s+/);
  const accent = parts.pop() || title;
  const lead = parts.join(" ");
  return (
    <>
      {lead ? <>{lead} </> : null}
      <span className="relative inline-block text-[var(--g-charcoal)]">
        {accent}
        <span
          className="absolute -bottom-1 left-0 h-[2.5px] w-full rounded-full bg-[var(--g-amber)]"
          aria-hidden
        />
      </span>
    </>
  );
}

export function GadgetNewArrivals({
  products,
  title = "Best Sellers",
  viewAllHref = "/products",
  headingId,
  tone = "default",
}: {
  products: Product[];
  title?: string;
  viewAllHref?: string;
  headingId?: string;
  tone?: "default" | "clay" | "leaf";
}) {
  const heading =
    headingId ||
    `rail-${
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "products"
    }`;
  const scrollerId = `rail-scroller-${heading}`;

  if (!products.length) return null;

  const containClass =
    heading === "best-sellers-heading" ? "" : "gadget-contain-rail ";

  return (
    <section
      className={
        tone === "clay"
          ? `gadget-band-clay ${containClass}px-4 py-8 sm:py-10 lg:px-8`
          : tone === "leaf"
            ? `gadget-band-leaf ${containClass}px-4 py-8 sm:py-10 lg:px-8`
            : `${containClass}px-4 py-8 sm:py-10 lg:px-8`
      }
      aria-labelledby={heading}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <h2
            id={heading}
            className="text-2xl font-bold tracking-tight text-[var(--g-charcoal)] sm:text-3xl"
          >
            <TitleWithAccent title={title} />
          </h2>
          <div className="flex items-center gap-2">
            <GadgetRailArrows scrollerId={scrollerId} title={title} />
            <Link
              href={viewAllHref}
              prefetch={false}
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/70 px-3.5 text-sm font-semibold text-[var(--g-forest)] transition hover:border-[var(--g-forest)]/30 hover:bg-[var(--g-white)]"
            >
              View all {title}
            </Link>
          </div>
        </div>

        <div
          id={scrollerId}
          className="overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x proximity" }}
        >
          <ul className="flex items-stretch gap-3.5 pb-1 sm:gap-4">
            {products.map((product) => (
              <li
                key={product._id}
                data-rail-card
                className="flex shrink-0 snap-start"
              >
                <GadgetArrivalCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
