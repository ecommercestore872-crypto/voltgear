"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { GadgetArrivalCard } from "@/components/gadget/gadget-arrival-card";
import type { Product } from "@/lib/types";

export function GadgetNewArrivals({
  products,
  title = "Best Sellers",
  viewAllHref = "/products2",
  headingId,
  tone = "default",
}: {
  products: Product[];
  title?: string;
  viewAllHref?: string;
  headingId?: string;
  tone?: "default" | "clay" | "leaf";
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const heading =
    headingId ||
    `rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "products"}`;

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 6);
    setCanNext(max > 6 && el.scrollLeft < max - 6);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, products.length]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-rail-card]");
    const step = card ? card.offsetWidth + 16 : 280;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  if (!products.length) return null;

  return (
    <section
      className={
        tone === "clay"
          ? "gadget-band-clay py-8 sm:py-10"
          : tone === "leaf"
            ? "gadget-band-leaf py-8 sm:py-10"
            : "py-8 sm:py-10"
      }
      aria-labelledby={heading}
    >
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
          <h2
            id={heading}
            className="gadget-section-rule gadget-h2 text-[var(--g-charcoal)] !text-xl sm:!text-2xl"
          >
            {title}
          </h2>
          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="button"
              aria-label="Previous"
              disabled={!canPrev}
              onClick={() => scrollByDir(-1)}
              className="gadget-icon-btn hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/80 text-[var(--g-charcoal)] disabled:opacity-30 sm:inline-flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              disabled={!canNext}
              onClick={() => scrollByDir(1)}
              className="gadget-icon-btn hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/80 text-[var(--g-charcoal)] disabled:opacity-30 sm:inline-flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              href={viewAllHref}
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/70 px-3.5 text-sm font-semibold text-[var(--g-forest)] transition hover:border-[var(--g-forest)]/30 hover:bg-[var(--g-white)]"
            >
              View all
            </Link>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x proximity" }}
        >
          <ul className="flex gap-3.5 pb-1 sm:gap-4">
            {products.map((product) => (
              <li key={product._id} data-rail-card className="snap-start">
                <GadgetArrivalCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
