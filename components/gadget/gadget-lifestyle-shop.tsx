import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cloudinaryImageUrl } from "@/lib/cloudinary";
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
    <section
      className="bg-[var(--g-cream)] px-4 py-8 sm:py-12 lg:px-8"
      aria-label="Lifestyle shop"
    >
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-2 lg:gap-6">
        {showBanner ? (
          <Link
            href={featureHref}
            className="group relative min-h-[26rem] w-full overflow-hidden rounded-[1.5rem] bg-[#e8eae3] sm:min-h-[32rem] lg:min-h-[38rem] shadow-sm transition hover:shadow-md"
          >
            {banner.imageUrl ? (
              <Image
                src={
                  cloudinaryImageUrl(banner.imageUrl, { w: 1200 }) ||
                  banner.imageUrl
                }
                alt=""
                fill
                quality={85}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="absolute inset-0 bg-neutral-200"
                aria-hidden
              />
            )}
            
            <div className="absolute inset-0 flex flex-col items-start justify-start p-8 sm:p-12 text-[#1a211c]">
              {banner.eyebrow ? (
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xs sm:text-sm font-semibold tracking-widest text-[#2f3d32] uppercase">
                    {banner.eyebrow}
                  </span>
                  <span className="w-12 border-t border-[#1a211c] opacity-30" />
                </div>
              ) : null}
              
              {banner.title ? (
                <span className="gadget-display mt-2 max-w-[12ch] text-[2.75rem] font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem] text-[#131a15]">
                  {banner.title}
                </span>
              ) : null}
              
              {banner.cta || banner.title ? (
                <span className="mt-8 flex h-12 items-center justify-center gap-3 rounded-full bg-[#1b3122] px-7 text-[15px] font-medium text-white shadow-lg transition duration-300 group-hover:bg-[#122217] group-hover:scale-105">
                  {banner.cta && !/^shop now$/i.test(banner.cta.trim())
                    ? banner.cta
                    : `Shop ${banner.title || "lifestyle picks"}`}
                  <ArrowRight className="h-4 w-4" />
                </span>
              ) : null}
            </div>
          </Link>
        ) : null}

        {grid.length ? (
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {grid.map((tile) => (
              <Link
                key={`${tile.href}-${tile.title}`}
                href={tile.href}
                className="group relative flex flex-col overflow-hidden rounded-[1.5rem] bg-[#F5F2EA] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl min-h-[14rem] sm:min-h-[18rem]"
              >
                <div className="absolute inset-0 z-0">
                  <Image
                    src={
                      cloudinaryImageUrl(tile.imageUrl, { w: 600 }) ||
                      tile.imageUrl
                    }
                    alt=""
                    fill
                    quality={80}
                    sizes="(max-width: 640px) 45vw, 25vw"
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
                  />
                </div>
                
                <div className="relative z-10 flex w-full justify-between items-start p-5 sm:p-7">
                  <span className="gadget-display max-w-[8ch] text-[1.4rem] font-medium leading-tight tracking-tight text-[#1a211c] sm:text-3xl">
                    {tile.title}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1b3122] text-white shadow-md transition duration-300 group-hover:bg-[#122217] group-hover:scale-110">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
