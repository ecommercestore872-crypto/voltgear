import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  lifestyleShopHasContent,
  visibleLifestyleTiles,
  type LifestyleShopConfig,
} from "@/lib/db/lifestyle-shop-rules";

export function GadgetLifestyleShop({ shop }: { shop: LifestyleShopConfig }) {
  if (!lifestyleShopHasContent(shop)) return null;

  const grid = visibleLifestyleTiles(shop);
  const banner = shop.banner;
  const featureHref = banner.href || "/products";
  const showBanner = Boolean(banner.imageUrl || banner.title || banner.eyebrow);

  return (
    <section className="bg-[var(--g-cream)] px-4 py-8 sm:py-12 lg:px-8" aria-label="Lifestyle shop">
      <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
        {showBanner ? (
          <Link
            href={featureHref}
            className="group relative min-h-[18rem] overflow-hidden rounded-2xl bg-[var(--g-forest)] sm:min-h-[22rem] lg:min-h-full"
          >
            {banner.imageUrl ? (
              <Image
                src={banner.imageUrl}
                alt=""
                fill
                quality={90}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-[center_30%] transition duration-700 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--g-sage)_35%,transparent),transparent_55%),linear-gradient(160deg,var(--g-forest-mid),var(--g-forest))]"
                aria-hidden
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-8 text-center sm:px-10 sm:pb-10">
              {banner.eyebrow ? (
                <span className="text-[12px] font-normal tracking-[0.02em] text-white/85">
                  {banner.eyebrow}
                </span>
              ) : null}
              {banner.title ? (
                <span className="gadget-display mt-1 max-w-[16ch] text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--g-white)] sm:text-3xl">
                  {banner.title}
                </span>
              ) : null}
              {banner.cta ? (
                <span className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--g-white)] px-5 text-sm font-medium text-[var(--g-charcoal)] shadow-[0_1px_0_rgba(26,26,26,0.06)] transition group-hover:bg-[var(--g-cream)]">
                  {banner.cta}
                </span>
              ) : null}
            </span>
          </Link>
        ) : null}

        {grid.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {grid.map((tile) => (
              <Link
                key={`${tile.href}-${tile.title}`}
                href={tile.href}
                className="group relative flex min-h-[10.5rem] flex-col overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3.5 shadow-[0_1px_0_rgba(26,26,26,0.03)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,54,38,0.1)] sm:min-h-[13rem] sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-medium text-[var(--g-charcoal)] sm:text-[13px]">
                    {tile.title}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-[var(--g-white)] transition group-hover:bg-[var(--g-forest-mid)]">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
                <div className="relative mt-2 flex-1">
                  <Image
                    src={tile.imageUrl}
                    alt={tile.title}
                    fill
                    quality={90}
                    sizes="(max-width: 640px) 45vw, 20vw"
                    className="object-contain p-1 transition duration-500 group-hover:scale-[1.05] sm:p-2"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
