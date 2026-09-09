"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ShoppingCart, Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchStoreProducts } from "@/lib/store-client";
import { imageUrl } from "@/lib/sanity/image";
import { getDefaultVariant, getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";

interface BundleItem {
  product: Product;
  selected: boolean;
}

/**
 * "Complete Your Setup" — same-category / compatible pairing suggestions
 * driven by real category data. No purchase-history wording ("Frequently
 * Bought Together"), no invented bundle discounts or savings.
 */
export function FrequentlyBoughtTogether({ current }: { current: Product }) {
  const [items, setItems] = useState<BundleItem[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetchStoreProducts()
      .then((products) => {
        const addable = (p: Product) => {
          if (p.stockStatus === "out-of-stock") return false;
          const v = getDefaultVariant(p);
          return v
            ? getStockState(v.stockStatus).purchasable
            : !p.variants?.length;
        };
        const sameCategory = products
          .filter(
            (p) =>
              p._id !== current._id &&
              p.category === current.category &&
              addable(p),
          )
          .slice(0, 2);
        const crossCategory = products
          .filter(
            (p) =>
              p._id !== current._id &&
              p.category !== current.category &&
              addable(p),
          )
          .slice(0, 2);
        const suggestions = [...sameCategory, ...crossCategory].slice(0, 3);
        setItems(suggestions.map((p) => ({ product: p, selected: true })));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current._id]);

  const currentLine = useMemo(() => {
    const v = getDefaultVariant(current);
    if (v) {
      return {
        slug: current.slug,
        name: current.name,
        price: v.price ?? current.price,
        image: current.images?.[0]
          ? imageUrl(current.images[0], { w: 128 })
          : undefined,
        productId: current._id,
        ...(current.sku ? { sku: current.sku } : {}),
        variantKey: v._key,
        variantId: v._key,
        variantName: v.name,
        ...(v.sku ? { variantSku: v.sku } : {}),
      };
    }
    if ((current.variants?.length ?? 0) > 0) return null;
    return {
      slug: current.slug,
      name: current.name,
      price: current.price,
      image: current.images?.[0]
        ? imageUrl(current.images[0], { w: 128 })
        : undefined,
      productId: current._id,
      ...(current.sku ? { sku: current.sku } : {}),
    };
  }, [current]);

  const bundlePrice = useMemo(() => {
    const base = currentLine?.price ?? 0;
    const extras = items
      .filter((i) => i.selected)
      .reduce((sum, i) => {
        const v = getDefaultVariant(i.product);
        return sum + (v?.price ?? i.product.price);
      }, 0);
    return base + extras;
  }, [currentLine, items]);

  if (items.length === 0) return null;

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  }

  function addBundleToCart() {
    if (!currentLine) return;
    addItem(currentLine);
    items
      .filter((i) => i.selected)
      .forEach((i) => {
        const v = getDefaultVariant(i.product);
        addItem({
          slug: i.product.slug,
          name: i.product.name,
          price: v?.price ?? i.product.price,
          image: i.product.images?.[0]
            ? imageUrl(i.product.images[0], { w: 128 })
            : undefined,
          productId: i.product._id,
          ...(i.product.sku ? { sku: i.product.sku } : {}),
          ...(v
            ? {
                variantKey: v._key,
                variantId: v._key,
                variantName: v.name,
                ...(v.sku ? { variantSku: v.sku } : {}),
              }
            : {}),
        });
      });
  }

  return (
    <section className="mt-16" aria-labelledby="complete-your-setup">
      <h2
        id="complete-your-setup"
        className="text-2xl font-bold tracking-tight"
      >
        Complete Your Setup
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Products that pair naturally with {current.name} — all in stock.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Current product */}
        <Card className="flex items-center gap-4 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {current.images?.[0] && (
              <Image
                src={imageUrl(current.images[0], { w: 160 })}
                alt={current.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{current.name}</p>
            <p className="mt-1 font-semibold">
              {formatPrice(currentLine?.price ?? current.price)}
            </p>
          </div>
          {currentLine && <Check className="h-5 w-5 shrink-0 text-primary" />}
        </Card>

        {/* Suggested items */}
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <Card
              key={item.product._id}
              className={cn(
                "flex items-center gap-3 p-3 transition-all",
                item.selected ? "border-primary/50 bg-primary/5" : "opacity-50",
              )}
            >
              <button
                onClick={() => toggleItem(index)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  item.selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
                aria-label={`Toggle ${item.product.name}`}
              >
                {item.selected && <Check className="h-3 w-3" />}
              </button>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.product.images?.[0] && (
                  <Image
                    src={imageUrl(item.product.images[0], { w: 120 })}
                    alt={item.product.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-xs font-medium">
                  {item.product.name}
                </p>
                <p className="text-xs font-semibold">
                  {formatPrice(item.product.price)}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Combined Price</p>
            <p className="mt-1 text-2xl font-bold">
              {formatPrice(bundlePrice)}
            </p>
          </div>
          <Button
            className="w-full gap-2"
            onClick={addBundleToCart}
            disabled={!currentLine}
            title={
              currentLine
                ? undefined
                : "Choose an option for this product first"
            }
          >
            <ShoppingCart className="h-4 w-4" />
            {currentLine ? "Add All to Cart" : "Options Required"}
          </Button>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plus className="h-3 w-3" />
            {items.filter((i) => i.selected).length + 1} items
          </p>
        </Card>
      </div>
    </section>
  );
}
