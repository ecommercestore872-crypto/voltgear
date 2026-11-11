import Link from "next/link";

import { CategoryGlyph } from "@/components/gadget/gadget-category-glyphs";
import { GadgetCategoryArrows } from "@/components/gadget/gadget-category-arrows";
import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { resolveCategoryImagePath } from "@/lib/category-image-resolve";
import { categoryImageUrl } from "@/lib/site-static-image";
import type { Product } from "@/lib/types";

export type CategoryIconTile = {
  label: string;
  href: string;
  slug?: string;
  image?: string;
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
  return tiles.map((t) => ({
    key: `p-${t.href}`,
    label: t.label,
    href: t.href,
    slug: t.slug ?? t.href.split("/").filter(Boolean).pop(),
    image:
      t.image ??
      (() => {
        const slug = t.slug ?? t.href.split("/").filter(Boolean).pop();
        const path = resolveCategoryImagePath(t.imageUrl, slug);
        if (path) return categoryImageUrl(path, 256);
        if (t.product) return gadgetImageSrc(t.product, PRODUCT_IMAGE.card);
        return undefined;
      })() ??
      undefined,
  }));
}

export function GadgetShopCategories({
  tiles,
  title,
}: {
  tiles: CategoryIconTile[];
  title?: string;
}) {
  const slides = buildSlides(tiles);

  if (!slides.length) return null;

  return (
    <section
      className="gadget-band-leaf gadget-contain-categories px-4 py-8 sm:py-12 lg:px-8"
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
              {title ? (
                <>
                  {title.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="relative inline-block text-[var(--g-charcoal)]">
                    {title.split(" ").slice(-1)[0]}
                    <span
                      className="absolute -bottom-1 left-0 h-[2.5px] w-full rounded-full bg-[var(--g-amber)]"
                      aria-hidden
                    />
                  </span>
                </>
              ) : (
                <>
                  Shop by{" "}
                  <span className="relative inline-block text-[var(--g-charcoal)]">
                    Categories
                    <span
                      className="absolute -bottom-1 left-0 h-[2.5px] w-full rounded-full bg-[var(--g-amber)]"
                      aria-hidden
                    />
                  </span>
                </>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              prefetch={false}
              className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#2a4633] transition hover:text-[var(--g-amber-text)] sm:text-sm"
            >
              <span>View all products</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>

            {/* Scroll buttons for desktop */}
            <GadgetCategoryArrows scrollerId="gadget-categories-scroller" />
          </div>
        </div>

        {/* Circular Avatar Category Row */}
        <div
          id="gadget-categories-scroller"
          className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none sm:gap-6 lg:gap-8"
        >
          {slides.map((tile, idx) => (
            <Link
              key={tile.key}
              href={tile.href}
              prefetch={false}
              className="group flex flex-col items-center gap-2.5 shrink-0 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--g-forest)] rounded-xl p-1 min-h-[44px]"
            >
              {/* Circle Avatar Stage */}
              <div
                className={`relative flex h-[5.75rem] w-[5.75rem] items-center justify-center overflow-hidden rounded-full bg-[var(--g-cream)] shadow-md ring-[3px] transition duration-300 group-hover:scale-105 group-hover:shadow-lg sm:h-28 sm:w-28 ${
                  [
                    "ring-[var(--g-forest)]",
                    "ring-[var(--g-sage)]",
                    "ring-[color-mix(in_srgb,var(--g-gold)_80%,var(--g-forest))]",
                    "ring-[var(--g-terracotta)]",
                  ][idx % 4]
                }`}
              >
                {tile.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={categoryImageUrl(tile.image, 256) ?? tile.image}
                    alt=""
                    width={112}
                    height={112}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-contain p-1.5 transition duration-300 group-hover:scale-[1.04]"
                  />
                ) : tile.glyph ? (
                  <CategoryGlyph
                    name={tile.glyph}
                    className="h-10 w-10 text-white sm:h-12 sm:w-12"
                  />
                ) : (
                  <CategoryGlyph
                    name="watch"
                    className="h-10 w-10 text-white sm:h-12 sm:w-12"
                  />
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
