"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { CategoryGlyph } from "@/components/gadget/gadget-category-glyphs";
import { gadgetImageSrc } from "@/lib/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { resolveCategoryImagePath } from "@/lib/category-image-resolve";
import { categoryImageUrl } from "@/lib/site-static-image";
import type { Product } from "@/lib/types";

export type CategoryIconTile = {
  /** Live product count for this category (omitted when unknown). */
  count?: number;
  label: string;
  href: string;
  slug?: string;
  product?: Product;
  imageUrl?: string;
};

type SlideTile = {
  count?: number;
  key: string;
  label: string;
  href: string;
  slug?: string;
  image?: string;
  glyph?: string;
};

function buildSlides(tiles: CategoryIconTile[]): SlideTile[] {
  const fromProducts: SlideTile[] = tiles.map((t) => ({
    count: t.count,
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
      className="object-contain p-1 transition duration-300 group-hover:scale-[1.04]"
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
    />
  );
}

const SPANS = [
  "lg:col-span-6",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-3",
];

export function GadgetShopCategories({
  tiles,
  title,
}: {
  tiles: CategoryIconTile[];
  title?: string;
}) {
  const slides = useMemo(() => buildSlides(tiles), [tiles]);

  if (!slides.length) return null;

  const heading = title?.trim() || "Shop by category";

  return (
    <section
      className="px-3 py-8 sm:px-5 sm:py-12 lg:px-8"
      aria-labelledby="shop-categories-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="login-section-head mb-5 sm:mb-7">
          <div>
            <p className="gadget-eyebrow mb-1.5">Browse by category</p>
            <h2
              id="shop-categories-heading"
              className="login-section-title text-2xl sm:text-3xl"
            >
              {heading}
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--g-charcoal)] transition hover:text-[var(--g-sage)] sm:text-[13px]"
          >
            View all
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-12 lg:gap-4">
          {slides.slice(0, 7).map((tile, i) => (
            <li key={tile.key} className={`min-w-0 ${SPANS[i % SPANS.length]}`}>
              <Link
                href={tile.href}
                className="group relative flex h-full min-h-[44px] flex-col rounded-[1.5rem] bg-white p-2.5 transition hover:shadow-[0_14px_34px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--g-forest)] sm:p-3 lg:min-h-[10.5rem] lg:flex-row lg:items-center lg:gap-4 lg:px-6"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.1rem] bg-[#f4f4f4] lg:aspect-auto lg:h-36 lg:w-32 lg:shrink-0 xl:w-40 lg:bg-transparent">
                  {tile.image ? (
                    <CategoryTileImage src={tile.image} slug={tile.slug} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <CategoryGlyph
                        name={tile.glyph || "watch"}
                        className="h-10 w-10 text-[var(--g-forest)] sm:h-12 sm:w-12"
                      />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-end justify-between gap-2 px-1.5 pb-1 pt-3 lg:h-full lg:flex-col lg:items-stretch lg:justify-between lg:p-0 lg:py-2">
                  {typeof tile.count === "number" && tile.count > 0 ? (
                    <p className="hidden text-right text-[13px] text-[var(--g-taupe)] lg:block">
                      {tile.count} {tile.count === 1 ? "Product" : "Products"}
                    </p>
                  ) : (
                    <span className="hidden lg:block" />
                  )}
                  <div className="flex min-w-0 items-end justify-between gap-2">
                    <div className="min-w-0 lg:pr-12">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--g-taupe)] lg:text-[13px] lg:tracking-[0.06em]">
                        Explore
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[15px] font-extrabold leading-tight tracking-tight text-[var(--g-charcoal)] sm:text-base">
                        {tile.label}
                      </p>
                      {typeof tile.count === "number" && tile.count > 0 ? (
                        <p className="mt-0.5 text-[11px] text-[var(--g-taupe)] lg:hidden">
                          {tile.count} {tile.count === 1 ? "Product" : "Products"}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ececec] text-[var(--g-charcoal)] transition group-hover:bg-[var(--g-forest)] group-hover:text-white lg:absolute lg:bottom-4 lg:right-5 lg:h-10 lg:w-11"
                      aria-hidden
                    >
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-2 rounded-[1.5rem] bg-white py-3 pl-3 pr-4 sm:mt-4 sm:pl-5">
          <ul className="flex min-w-0 flex-1 gap-5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-8">
            {slides.map((tile) => (
              <li key={`strip-${tile.key}`} className="shrink-0">
                <Link
                  href={tile.href}
                  className="flex min-h-11 flex-col items-center gap-1 text-center"
                >
                  <span className="relative block h-8 w-8">
                    {tile.image ? (
                      <Image
                        src={categoryImageUrl(tile.image, 96) ?? tile.image}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    ) : null}
                  </span>
                  <span className="max-w-[6rem] truncate text-[11px] font-bold text-[var(--g-charcoal)]">
                    {tile.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/products"
            className="hidden shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--g-taupe)] hover:text-[var(--g-sage)] sm:inline"
          >
            View all categories
          </Link>
        </div>
      </div>
    </section>
  );
}
