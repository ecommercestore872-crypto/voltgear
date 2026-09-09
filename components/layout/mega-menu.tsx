"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Watch,
  BatteryCharging,
  Plug,
  Headphones,
  Package,
} from "lucide-react";

import { fetchFeaturedStoreProducts } from "@/lib/store-client";
import { imageUrl } from "@/lib/sanity/image";
import {
  FALLBACK_SHOP_TYPES,
  shopTypeLinks,
  type ShopType,
} from "@/lib/categories";
import type { StoreImage } from "@/lib/types";

interface MegaProduct {
  slug: string;
  name: string;
  price: number;
  images: StoreImage[];
  category: string;
  featured?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  smartwatch: Watch,
  "power-bank": BatteryCharging,
  charger: Plug,
  earbuds: Headphones,
};

export function MegaMenu({
  open,
  onClose,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  open: boolean;
  onClose?: () => void;
  shopTypes?: ShopType[];
}) {
  const [products, setProducts] = useState<Record<string, MegaProduct[]>>({});
  const [loaded, setLoaded] = useState(false);
  const links = shopTypeLinks(shopTypes);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loaded || !open) return;
    Promise.all(
      links.map(async (link) => {
        const cat = link.href.split("/").pop()!;
        const featured = await fetchFeaturedStoreProducts(cat);
        return [
          cat,
          featured.slice(0, 1).map((p) => ({
            slug: p.slug,
            name: p.name,
            price: p.price,
            images: p.images,
            category: p.category,
            featured: p.featured,
          })),
        ] as const;
      }),
    )
      .then((entries) => {
        setProducts(Object.fromEntries(entries));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [loaded, open, links]);

  // Handle escape key & click outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose?.();
      }
    }
    function handlePointerDown(e: PointerEvent) {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        // Only close if click target is not the Categories button itself
        const targetElement = e.target as HTMLElement | null;
        if (!targetElement?.closest("[aria-haspopup='true']")) {
          onClose?.();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onClose]);

  return (
    <div
      ref={menuRef}
      className={`fixed left-0 right-0 top-[60px] z-30 border-b bg-background shadow-lg transition-all duration-200 ${
        open
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-2 opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-[1600px] p-6 lg:px-8">
        <div className="grid grid-cols-4 gap-6 lg:grid-cols-6">
          {links.map((link) => {
            const cat = link.href.split("/").pop()!;
            const Icon = CATEGORY_ICONS[cat] || Package;
            const items = products[cat] ?? [];
            const repImage = items[0]?.images?.[0];

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                onClick={onClose}
                className="group flex flex-col items-center text-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-2"
              >
                <div className="relative mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary/50">
                  {repImage ? (
                    <Image
                      src={imageUrl(repImage, { w: 150 })}
                      alt={link.label}
                      fill
                      sizes="96px"
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <Icon className="h-8 w-8 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
                  )}
                </div>
                <span className="text-sm font-semibold">{link.label}</span>
              </Link>
            );
          })}

          <Link
            href="/products"
            prefetch={false}
            onClick={onClose}
            className="group flex flex-col items-center justify-center text-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-2"
          >
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-primary/5 text-primary">
              <ArrowRight className="h-8 w-8 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
            <span className="text-sm font-semibold text-primary">View All</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
