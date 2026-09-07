"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchStoreProducts } from "@/lib/store-client";
import { imageUrl } from "@/lib/sanity/image";
import { getDefaultVariant, getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/utils";

export function CartUpsell({ excludeSlugs }: { excludeSlugs: string[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetchStoreProducts()
      .then((all) => {
        const addable = (p: Product) => {
          if (p.stockStatus === "out-of-stock") return false;
          const v = getDefaultVariant(p);
          return v ? getStockState(v.stockStatus).purchasable : !(p.variants?.length);
        };
        const suggestions = all
          .filter((p) => !excludeSlugs.includes(p.slug) && addable(p))
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 3);
        setProducts(suggestions);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeSlugs.join(",")]);

  if (products.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        You might also like
      </p>
      <div className="space-y-3">
        {products.map((p) => {
          const img = p.images?.[0];
          return (
            <div key={p._id} className="flex items-center gap-3">
              {img ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={imageUrl(img, { w: 96 })}
                    alt={p.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-xs font-medium">{p.name}</p>
                <p className="text-xs font-semibold">{formatPrice(p.price)}</p>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                aria-label={`Add ${p.name} to cart`}
                onClick={() => {
                  const v = getDefaultVariant(p);
                  addItem({
                    slug: p.slug,
                    name: p.name,
                    price: v?.price ?? p.price,
                    image: img ? imageUrl(img, { w: 128 }) : undefined,
                    productId: p._id,
                    ...(p.sku ? { sku: p.sku } : {}),
                    ...(v
                      ? {
                          variantKey: v._key,
                          variantId: v._key,
                          variantName: v.name,
                          ...(v.sku ? { variantSku: v.sku } : {}),
                        }
                      : {}),
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
