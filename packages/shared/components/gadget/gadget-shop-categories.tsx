"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

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
      className="object-contain p-1 transition duration-300 group-hover:scale-[1.04]"
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

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {slides.map((tile) => (
            <li key={tile.key} className="min-w-0">
              <Link
                href={tile.href}
                className="group flex h-full min-h-[44px] flex-col rounded-[1.5rem] bg-white p-2.5 transition hover:shadow-[0_14px_34px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--g-forest)] sm:p-3"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.1rem] bg-[#f4f4f4]">
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
                <div className="flex items-end justify-between gap-2 px-1.5 pb-1 pt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--g-taupe)]">
                      Explore
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[15px] font-extrabold leading-tight tracking-tight text-[var(--g-charcoal)] sm:text-base">
                      {tile.label}
                    </p>
                  </div>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-white transition group-hover:bg-[var(--g-sage)]"
                    aria-hidden
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
