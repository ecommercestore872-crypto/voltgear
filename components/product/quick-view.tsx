"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/product/star-rating";
import { imageUrl } from "@/lib/sanity/image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { getStockState, getDefaultVariant } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";

export function QuickViewButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const image = product.images?.[0];
  const stock = getStockState(product.stockStatus);
  const outOfStock = stock.soldOut;
  const defaultVariant = getDefaultVariant(product);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const variantPurchasable =
    defaultVariant && getStockState(defaultVariant.stockStatus).purchasable;
  const canDirectAdd = !hasVariants || variantPurchasable;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
            100,
        )
      : 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="absolute bottom-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-background hover:shadow-lg max-sm:opacity-100 opacity-0 group-hover:opacity-100"
          aria-label={`Quick view ${product.name}`}
        >
          <Eye className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0">
        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square bg-muted">
            {image ? (
              <Image
                src={imageUrl(image, { w: PRODUCT_IMAGE.card })}
                alt={product.name}
                fill
                quality={90}
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-contain p-3"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute left-3 top-3 bg-destructive text-white">
                -{discount}%
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.category.replace("-", " ")}
            </p>
            <h3 className="mt-1 text-lg font-bold leading-snug">
              {product.name}
            </h3>

            <div className="mt-2 flex items-center gap-2">
              {typeof product.reviewCount === "number" &&
                product.reviewCount > 0 && (
                  <>
                    <StarRating rating={product.rating} size={14} />
                    <span className="text-xs text-muted-foreground">
                      ({product.reviewCount})
                    </span>
                  </>
                )}
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            <Badge variant={stock.badgeVariant} className="mt-2 w-fit">
              {stock.label}
            </Badge>

            {product.shortDescription && (
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {product.shortDescription}
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4">
              {outOfStock || !canDirectAdd ? (
                <Button
                  asChild
                  className="w-full"
                  variant={outOfStock ? "default" : "outline"}
                >
                  <Link href={`/product/${product.slug}`}>
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
        freeShipping: Boolean(product.freeShipping),
        freeShipping: Boolean(product.freeShipping),
                      ...(product.sku ? { sku: product.sku } : {}),
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
                  }}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/product/${product.slug}`}>View Full Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
