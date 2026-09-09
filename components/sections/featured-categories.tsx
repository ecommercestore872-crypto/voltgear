import Image from "next/image";
import Link from "next/link";

import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";

interface CategoryCard {
  label: string;
  href: string;
  product: Product;
}

export function FeaturedCategories({ cards }: { cards: CategoryCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="border-b bg-background">
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8 max-w-screen-xl md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Shop by Category
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {/* Desktop: uniform grid; Mobile: horizontal scroll */}
        <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3 md:gap-4">
          {cards.map((card) => (
            <CategoryItem key={card.href} card={card} />
          ))}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {cards.map((card) => (
            <div
              key={card.href}
              className="shrink-0 w-[calc(33.333%-8px)] min-w-[90px] max-w-[130px]"
            >
              <CategoryItem card={card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryItem({ card }: { card: CategoryCard }) {
  const image = card.product.images?.[0] || card.product.cloudinaryImages?.[0];

  return (
    <Link
      href={card.href}
      className="group flex flex-col items-center gap-2.5 text-center"
    >
      {/* Category image container */}
      <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-border/60 bg-secondary/30 transition-all duration-300 group-hover:bg-secondary/60 group-hover:border-primary/50 group-hover:shadow-sm">
        {image ? (
          <Image
            src={imageUrl(image, { w: 240 })}
            alt={`${card.label} category`}
            fill
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 12vw"
            className="object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {card.label[0]}
            </span>
          </div>
        )}
      </div>

      {/* Category name */}
      <span className="text-[12px] font-medium leading-tight text-foreground group-hover:text-foreground/70 transition-colors">
        {card.label}
      </span>
    </Link>
  );
}
