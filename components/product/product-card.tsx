"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/product/star-rating";
import { QuickViewButton } from "@/components/product/quick-view";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { CompareButton } from "@/components/product/product-comparison";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { imageUrl } from "@/lib/sanity/image";
import { getStockState, getDefaultVariant } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";
import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { useGadgetPreview } from "@/components/gadget/use-gadget-preview";
import { product2Href } from "@/lib/gadget-preview";

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { addItem } = useCart();
  const gadget = useGadgetPreview();
  const href = gadget ? product2Href(product.slug) : `/product/${product.slug}`;
  const image = product.images?.[0];
  const stock = getStockState(product.stockStatus);
  const outOfStock = stock.soldOut;
  const defaultVariant = getDefaultVariant(product);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const variantPurchasable =
    defaultVariant && getStockState(defaultVariant.stockStatus).purchasable;
  const canDirectAdd = !hasVariants || variantPurchasable;
  const hasRealReviews =
    typeof product.reviewCount === "number" && product.reviewCount > 0 &&
    typeof product.rating === "number" && product.rating > 0;
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-0 bg-transparent shadow-none",
        className
      )}
    >
      <Link href={href} prefetch={false} className="block">
        <div className="gadget-studio-stage relative aspect-square overflow-hidden rounded-2xl">
          {image ? (
            <Image
              ref={imgRef}
              src={imageUrl(image, { w: PRODUCT_IMAGE.card })}
              alt={product.name}
              fill
              quality={90}
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {product.badge && (
            <div className="absolute top-2 left-2 z-10 flex items-center justify-center rounded bg-black/80 backdrop-blur-md border border-white/10 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-md">
              {product.badge}
            </div>
          )}
        </div>

        {/* Hover action icons — Top Right */}
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
          <WishlistButton product={product} />
          <div className="opacity-0 transition-all duration-300 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col gap-1.5">
            <QuickViewButton product={product} />
            <CompareButton slug={product.slug} />
          </div>
        </div>
      </Link>

      {/* Product info below image */}
      <div className="flex flex-col flex-1 p-5 text-center items-center gap-3">
        {/* Rating above title */}
        {hasRealReviews ? (
          <div className="flex items-center gap-1 opacity-70">
            <StarRating rating={product.rating ?? 0} size={10} />
          </div>
        ) : (
          <div className="h-[10px]" aria-hidden="true" />
        )}

        {/* Product name */}
        <Link
          href={href}
          className="line-clamp-2 font-medium leading-snug transition-colors hover:text-primary"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2">
          {typeof product.reviewCount === "number" &&
            product.reviewCount > 0 && (
              <Link
                href={`${href}#reviews`}
                title="View reviews"
                className="flex items-center gap-2 rounded transition-colors hover:text-primary"
              >
                <StarRating rating={product.rating} size={14} />
                <span className="text-xs text-muted-foreground underline-offset-2 group-hover:underline">
                  ({product.reviewCount})
                </span>
              </Link>
            )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 w-full">
          <div className="flex flex-col text-left">
            <span className="font-semibold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          <Badge variant={stock.badgeVariant}>{stock.label}</Badge>
        </div>

        {outOfStock || !canDirectAdd ? (
          <Button asChild className="w-full" variant={outOfStock ? "default" : "outline"}>
            <Link href={href}>
              {outOfStock ? "Sold Out" : "View Options"}
            </Link>
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              addItem({
                slug: product.slug,
                name: product.name,
                price: defaultVariant?.price ?? product.price,
                image: image ? imageUrl(image, { w: 128 }) : undefined,
                productId: product._id,
                ...(defaultVariant
                  ? {
                      variantKey: defaultVariant._key,
                      variantId: defaultVariant._key,
                      variantName: defaultVariant.name,
                      ...(defaultVariant.sku
                        ? { variantSku: defaultVariant.sku }
                        : {}),
                    }
                  : {}),
              });
              dispatchAddToCartEffect(imgRef.current);
            }}
          >
            Add to Cart
          </Button>
        )}
      </div>
    </Card>
  );
}
