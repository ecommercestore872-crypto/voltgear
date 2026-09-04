import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";

export type LifestyleTile = {
  label: string;
  href: string;
  product: Product;
};

function tileLabel(href: string, fallback: string) {
  // Use the admin-managed category name directly.
  return fallback;
}

export function GadgetLifestyleShop({
  tiles,
  feature,
}: {
  tiles: LifestyleTile[];
  feature?: {
    imageUrl?: string;
    eyebrow?: string;
    title?: string;
    href?: string;
    cta?: string;
  };
}) {
  const grid = tiles.slice(0, 4);
  if (!grid.length && !feature) return null;

  const featureHref = feature?.href || "/products2";
  const featureTitle = feature?.title || "Tech that keeps up";
  const featureEyebrow = feature?.eyebrow || "Curated picks";
  const featureCta = feature?.cta || "Shop now";
  const featureImage = feature?.imageUrl;

  return (
    <section className="bg-[var(--g-cream)] px-4 py-8 sm:py-12 lg:px-8" aria-label="Shop by lifestyle">
      <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Large feature */}
        <Link
          href={featureHref}
          className="group relative min-h-[22rem] overflow-hidden rounded-2xl bg-[var(--g-forest)] sm:min-h-[26rem] lg:min-h-full"
        >
          {featureImage ? (
            <Image
              src={featureImage}
              alt=""
              fill
              quality={90}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--g-sage)_35%,transparent),transparent_55%),linear-gradient(160deg,var(--g-forest-mid),var(--g-forest))]"
              aria-hidden
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-8 text-center sm:pb-10">
            <span className="text-[12px] font-medium tracking-[0.04em] text-white/80">
              {featureEyebrow}
            </span>
            <span className="gadget-display mt-1 max-w-[16ch] text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--g-white)] sm:text-3xl">
              {featureTitle}
            </span>
            <span className="mt-5 inline-flex min-h-10 items-center rounded-full border border-white/70 px-5 text-sm font-medium text-[var(--g-white)] transition group-hover:bg-[var(--g-white)] group-hover:text-[var(--g-forest)]">
              {featureCta}
            </span>
          </span>
        </Link>

        {/* 2×2 category tiles */}
        {grid.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {grid.map((tile) => {
              const image = gadgetImageSrc(tile.product, PRODUCT_IMAGE.card);
              const label = tileLabel(tile.href, tile.label);
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className="group relative flex min-h-[11rem] flex-col overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3.5 shadow-[0_1px_0_rgba(26,26,26,0.03)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,54,38,0.1)] sm:min-h-[13rem] sm:p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-medium text-[var(--g-charcoal)] sm:text-[13px]">
                      {label}
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-[var(--g-white)] transition group-hover:bg-[var(--g-forest-mid)]">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                  <div className="relative mt-2 flex-1">
                    {image ? (
                      <Image
                        src={image}
                        alt={tile.label}
                        fill
                        quality={90}
                        sizes="(max-width: 640px) 45vw, 20vw"
                        className="object-contain p-1 transition duration-500 group-hover:scale-[1.05] sm:p-2"
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
