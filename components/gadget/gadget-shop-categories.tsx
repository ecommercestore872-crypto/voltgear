"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { CategoryGlyph } from "@/components/gadget/gadget-category-glyphs";
import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";

export type CategoryIconTile = {
  label: string;
  href: string;
  product: Product;
  imageUrl?: string;
};

type SlideTile = {
  key: string;
  label: string;
  href: string;
  image?: string;
  glyph?: string;
};

function buildSlides(tiles: CategoryIconTile[]): SlideTile[] {
  const fromProducts: SlideTile[] = tiles.map((t) => ({
    key: `p-${t.href}`,
    label: t.label,
    href: t.href,
    image: t.imageUrl || gadgetImageSrc(t.product, PRODUCT_IMAGE.card) || undefined,
  }));

  return fromProducts;
}

export function GadgetShopCategories({ tiles }: { tiles: CategoryIconTile[] }) {
  const slides = useMemo(() => buildSlides(tiles), [tiles]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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
  }, [updateArrows, slides.length]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.65;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  if (!slides.length) return null;

  return (
    <section
      className="gadget-band-leaf px-4 py-8 sm:py-12 lg:px-8"
      aria-labelledby="shop-categories-heading"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <div>
            <h2
              id="shop-categories-heading"
              className="text-2xl font-bold tracking-tight text-[var(--g-charcoal)] sm:text-3xl"
            >
              Shop by{" "}
              <span className="relative inline-block text-[var(--g-charcoal)]">
                Categories
                <span
                  className="absolute -bottom-1 left-0 h-[2.5px] w-full rounded-full bg-[var(--g-amber)]"
                  aria-hidden
                />
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products2"
              className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#2a4633] transition hover:text-[var(--g-amber-text)] sm:text-sm"
            >
              <span>View All</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>

            {/* Scroll buttons for desktop */}
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollByDir(-1)}
                disabled={!canPrev}
                aria-label="Previous categories"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--g-line)] bg-white text-[var(--g-charcoal)] shadow-xs transition disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByDir(1)}
                disabled={!canNext}
                aria-label="Next categories"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--g-line)] bg-white text-[var(--g-charcoal)] shadow-xs transition disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Circular Avatar Category Row */}
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none sm:gap-6 lg:gap-8"
        >
          {slides.map((tile, idx) => (
            <Link
              key={tile.key}
              href={tile.href}
              className="group flex flex-col items-center gap-2.5 shrink-0 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--g-forest)] rounded-xl p-1 min-h-[44px]"
            >
              {/* Circle Avatar Stage */}
              <div
                className={`relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full shadow-md ring-2 ring-white/70 transition duration-300 group-hover:scale-105 group-hover:shadow-xl sm:h-28 sm:w-28 ${
                  ["bg-[var(--g-forest)]", "bg-[var(--g-sage)]", "bg-[var(--g-terracotta)]", "bg-[var(--g-forest-mid)]"][
                    idx % 4
                  ]
                }`}
              >
                {tile.image ? (
                  <Image
                    src={tile.image}
                    alt={tile.label}
                    fill
                    priority={idx < 4}
                    quality={90}
                    sizes="(max-width: 640px) 88px, 112px"
                    className="object-cover transition duration-300 group-hover:scale-110"
                  />
                ) : tile.glyph ? (
                  <CategoryGlyph name={tile.glyph} className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                ) : (
                  <CategoryGlyph name="watch" className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                )}
              </div>

              {/* Label */}
              <span className="w-[5.5rem] text-xs font-bold leading-snug text-[#1A202C] transition duration-300 group-hover:text-[var(--g-forest)] sm:w-28 sm:text-[13px]">
                {tile.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
