import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";

import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";

export function MobileCategoryStrip({
  cards,
}: {
  cards: { label: string; href: string; product: Product }[];
}) {
  if (cards.length === 0) return null;

  return (
    <div className="w-full border-b bg-background overflow-hidden">
      <div className="mx-auto max-w-screen-xl px-4 py-4 md:px-6">
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory justify-start md:justify-center hide-scrollbar">
          {cards.map((card, index) => {
            const image =
              card.product.images?.[0] || card.product.cloudinaryImages?.[0];
            return (
              <Link
                key={card.href}
                href={card.href}
                className="flex shrink-0 snap-start flex-col items-center justify-start group w-[76px] sm:w-[84px] md:w-[94px] transition-transform duration-300 animate-premium-slide fill-mode-both"
                style={{ animationDelay: `${150 + index * 75}ms` }}
              >
                <div className="relative mb-3 flex h-[64px] w-[64px] sm:h-[72px] sm:w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-secondary/30 transition-all duration-300 group-hover:border-primary group-hover:bg-secondary/60 group-hover:scale-110 group-hover:shadow-md">
                  {image ? (
                    <Image
                      src={imageUrl(image, { w: 120 })}
                      alt={card.label}
                      fill
                      sizes="(max-width: 768px) 72px, 96px"
                      className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <Package
                      aria-hidden="true"
                      className="h-6 w-6 text-muted-foreground transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                </div>
                <span className="text-center text-[11px] sm:text-xs font-semibold tracking-tight leading-tight text-foreground transition-colors duration-300 group-hover:text-primary line-clamp-2">
                  {card.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
