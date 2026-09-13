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
            
            {(() => {
              let parsedTitle = banner.title || "";
              let subtitle = "";
              if (parsedTitle.trim().startsWith("{")) {
                try {
                  const p = JSON.parse(parsedTitle);
                  parsedTitle = p.text || "";
                  subtitle = p.subtitle || "";
                } catch {}
              }

              return (
                <div className="absolute inset-0 flex flex-col items-start justify-start p-8 sm:p-12 text-[#1a211c]">
                  {banner.eyebrow ? (
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-xs sm:text-sm font-semibold tracking-widest text-[#2f3d32] uppercase">
                        {banner.eyebrow}
                      </span>
                      <span className="w-12 border-t border-[#1a211c] opacity-30" />
                    </div>
                  ) : null}
                  
                  {parsedTitle ? (
                    <span className="gadget-display mt-2 max-w-[12ch] text-[2.75rem] font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem] text-[#131a15]">
                      {parsedTitle}
                    </span>
                  ) : null}

                  {subtitle ? (
                    <span className="mt-5 max-w-[28ch] text-[1.1rem] leading-relaxed text-[#2a362c]">
                      {subtitle}
                    </span>
                  ) : null}
                  
                  {banner.cta || parsedTitle ? (
                    <span className="mt-8 flex h-12 items-center justify-center gap-3 rounded-full bg-[#1b3122] px-7 text-[15px] font-medium text-white shadow-lg transition duration-300 group-hover:bg-[#122217] group-hover:scale-105 pointer-events-auto">
                      {banner.cta && !/^shop now$/i.test(banner.cta.trim())
                        ? banner.cta
                        : `Shop ${parsedTitle || "lifestyle picks"}`}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
              );
            })()}
          </Link>
        ) : null}

        {grid.length ? (
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {grid.map((tile) => {
              let parsedTitle = tile.title;
              let eyebrow = "";
              let subtitle = "";
              let footer = "";
              if (tile.title.trim().startsWith("{")) {
                try {
                  const p = JSON.parse(tile.title);
                  parsedTitle = p.text || "";
                  eyebrow = p.eyebrow || "";
                  subtitle = p.sub || "";
                  footer = p.footer || "";
                } catch {}
              }
              
              return (
              <Link
                key={`${tile.href}-${parsedTitle}`}
                href={tile.href}
                className="group relative flex flex-col overflow-hidden rounded-[1.5rem] bg-[#F5F2EA] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl min-h-[16rem] sm:min-h-[22rem]"
              >
                <div className="absolute inset-0 z-0">
                  <Image
                    src={
                      cloudinaryImageUrl(tile.imageUrl, { w: 600 }) ||
                      tile.imageUrl
                    }
                    alt=""
                    fill
                    quality={85}
                    sizes="(max-width: 640px) 45vw, 25vw"
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
                  />
                </div>
                
                <div className="relative z-10 flex w-full justify-between items-start p-5 sm:p-7 pointer-events-none">
                  <div className="flex flex-col gap-1 items-start text-[#1a211c]">
                    {eyebrow ? (
                      <span className="text-[10px] font-semibold tracking-widest text-[#5c6e5e] uppercase">
                        {eyebrow}
                      </span>
                    ) : null}
                    
                    <span className="gadget-display max-w-[10ch] text-[1.4rem] font-medium leading-[1.1] tracking-tight sm:text-3xl lg:text-[2rem] pt-1 pb-1 text-[#131a15]">
                      {parsedTitle}
                    </span>
                    
                    {subtitle ? (
                      <span className="text-[13px] leading-snug tracking-tight text-[#455047] max-w-[14ch] mt-1 lg:max-w-xs">
                        {subtitle}
                      </span>
                    ) : null}
                  </div>
                  
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b3122] text-white shadow-md transition duration-300 group-hover:bg-[#122217] group-hover:scale-110 pointer-events-auto">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                
                {footer ? (
                  <div className="relative z-10 flex-col mt-auto items-start p-5 sm:p-7 text-[#838c85]">
                     <span className="w-6 border-t border-[#838c85]/40 block mb-2" />
                     <span className="text-[10px] font-semibold tracking-widest uppercase leading-tight max-w-[10ch] block">
                       {footer}
                     </span>
                  </div>
                ) : null}
              </Link>
            )})}
          </div>
        ) : null}
      </div>
    </section>
  );
}
