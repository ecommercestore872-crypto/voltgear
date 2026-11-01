"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CategoryGlyph } from "@/components/gadget/gadget-category-glyphs";
import { gadgetImageSrc } from "@/lib/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { resolveCategoryImagePath } from "@/lib/category-image-resolve";
import { categoryImageUrl } from "@/lib/site-static-image";
import type { Product } from "@/lib/types";

export type CategoryIconTile = {
  label: string;
  href: string;
  slug?: string;
  product?: Product;
  imageUrl?: string;
};

type SlideTile = {
  key: string;
  label: string;
  href: string;
  slug?: string;
  image?: string;
  glyph?: string;
};

function buildSlides(tiles: CategoryIconTile[]): SlideTile[] {
  const fromProducts: SlideTile[] = tiles.map((t) => ({
    key: `p-${t.href}`,
    label: t.label,
    href: t.href,
    slug: t.slug ?? t.href.split("/").filter(Boolean).pop(),
    image: (() => {
      const slug = t.slug ?? t.href.split("/").filter(Boolean).pop();
      const path = resolveCategoryImagePath(t.imageUrl, slug);
      if (path) return categoryImageUrl(path, 256);
      if (t.product) return gadgetImageSrc(t.product, PRODUCT_IMAGE.card);
      return undefined;
    })() ?? undefined,
  }));

  return fromProducts;
}

function CategoryTileImage({
  src,
  slug,
}: {
  src: string;
  slug?: string;
}) {
  const [current, setCurrent] = useState(src);
  const fallback = slug ? resolveCategoryImagePath(null, slug) : undefined;
  const display = categoryImageUrl(current, 256) ?? current;

  return (
    <Image
      src={display}
      alt=""
      fill
      quality={90}
      sizes="(max-width: 640px) 96px, 128px"
      className="object-contain p-1.5 transition duration-300 group-hover:scale-[1.03]"
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
    />
  );
}

export function GadgetShopCategories({
  tiles,
  title,
}: {
  tiles: CategoryIconTile[];
  title?: string;
}) {
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

  const heading = title?.trim() || "Shop by category";

  return (
    <section
      className="gadget-band-leaf px-4 py-8 sm:py-12 lg:px-8"
      aria-labelledby="shop-categories-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <h2
            id="shop-categories-heading"
            className="text-2xl font-bold tracking-tight text-[var(--g-charcoal)] sm:text-3xl"
          >
            {heading}
          </h2>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--g-forest)] transition hover:text-[var(--g-amber-text)] sm:text-sm"
            >
              View all
              <span aria-hidden>→</span>
            </Link>

            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollByDir(-1)}
                disabled={!canPrev}
                aria-label="Previous categories"
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--g-line)] bg-white text-[var(--g-charcoal)] transition disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByDir(1)}
                disabled={!canNext}
                aria-label="Next categories"
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--g-line)] bg-white text-[var(--g-charcoal)] transition disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto overscroll-x-contain pb-3 pt-1 scrollbar-none sm:gap-4 lg:gap-5"
        >
          {slides.map((tile) => (
            <Link
              key={tile.key}
              href={tile.href}
              className="group flex min-h-[44px] shrink-0 flex-col items-center gap-2 rounded-[10px] p-1 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--g-forest)]"
            >
              <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-[10px] border border-[var(--g-line)] bg-[var(--g-cream)] transition duration-300 group-hover:border-[var(--g-forest)]/35 sm:h-28 sm:w-28">
                {tile.image ? (
                  <CategoryTileImage src={tile.image} slug={tile.slug} />
                ) : tile.glyph ? (
                  <CategoryGlyph
                    name={tile.glyph}
                    className="h-10 w-10 text-[var(--g-forest)] sm:h-12 sm:w-12"
                  />
                ) : (
                  <CategoryGlyph
                    name="watch"
                    className="h-10 w-10 text-[var(--g-forest)] sm:h-12 sm:w-12"
                  />
                )}
              </div>

              <span className="w-[5.5rem] text-xs font-semibold leading-snug text-[var(--g-charcoal)] transition duration-300 group-hover:text-[var(--g-forest)] sm:w-28 sm:text-[13px]">
                {tile.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
