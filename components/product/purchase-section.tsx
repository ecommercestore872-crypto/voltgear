"use client";

import { useMemo, useRef, useState } from "react";
import {
  Banknote,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Heart,
  GitCompare,
  Share2,
  Info,
  Lock
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BuyNow } from "@/components/product/buy-now";
import { ProductGallery } from "@/components/product/product-gallery";
import { StarRating } from "@/components/product/star-rating";
import { useCart } from "@/components/cart/cart-provider";
import { trackAddToCart } from "@/lib/analytics";
import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { imageUrl } from "@/lib/sanity/image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { VariantAxisPickers } from "@/components/product/variant-axis-pickers";
import { getVariantStockState } from "@/lib/stock";
import type { Product, ProductVariant } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import {
  axesEnabled,
  canSubmitVariantSelection,
  colorImageForKey,
  comboVariantKey,
  initialAxisSelection,
} from "@/lib/variant-options-rules";
import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { ProductSocialVideoModal } from "@/components/product/product-social-video-modal";

function defaultVariant(product: Product): ProductVariant | null {
  const variants = product.variants ?? [];
  if (!variants.length) return null;
  return variants.find((v) => v.isDefault) ?? variants[0];
}

export function PurchaseSection({
  product,
}: {
  product: Product;
}) {
  const { addItem } = useCart();
  const axesOn = axesEnabled(product);
  const [colorKey, setColorKey] = useState<string | null>(() =>
    initialAxisSelection(product.colorOptions)
  );
  const [sizeKey, setSizeKey] = useState<string | null>(() =>
    initialAxisSelection(product.sizeOptions)
  );
  const [legacyVariant, setLegacyVariant] = useState<ProductVariant | null>(() =>
    axesOn ? null : defaultVariant(product)
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const selectedKey = axesOn ? comboVariantKey(colorKey, sizeKey) : legacyVariant?._key;
  const variant = axesOn
    ? (product.variants ?? []).find((v) => v._key === selectedKey) ?? null
    : legacyVariant;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const selectionReady = axesOn
    ? canSubmitVariantSelection(product, colorKey, sizeKey)
    : !hasVariants || Boolean(variant);
  const stock = getVariantStockState(product, variant);
  const outOfStock = stock.soldOut;

  const price = axesOn ? product.price : variant?.price ?? product.price;
  const compareAtPrice = axesOn
    ? product.compareAtPrice
    : variant?.compareAtPrice ?? product.compareAtPrice;
  const discount =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const colorPhoto = axesOn ? colorImageForKey(product.colorOptions, colorKey) : variant?.image;
  const selectedVariantImage = useMemo(() => {
    if (!colorPhoto) return null;
    return {
      src: imageUrl(colorPhoto, { w: PRODUCT_IMAGE.gallery }),
      thumb: imageUrl(colorPhoto, { w: PRODUCT_IMAGE.thumb }),
      alt: `${product.name}${variant?.name ? ` — ${variant.name}` : ""}`,
    };
  }, [colorPhoto, product.name, variant?.name]);

  const itemImage = colorPhoto
    ? imageUrl(colorPhoto, { w: 128 })
    : product.images?.[0]
      ? imageUrl(product.images[0], { w: 128 })
      : product.cloudinaryImages?.[0]
        ? cloudinaryImageUrl(product.cloudinaryImages[0], { w: 128 })
        : undefined;

  function handleAdd() {
    if (outOfStock || !selectionReady) return;
    addItem(
      {
        slug: product.slug,
        name: product.name,
        price,
        image: itemImage,
        productId: product._id,
        ...(variant && hasVariants
          ? {
              variantKey: variant._key,
              variantId: variant._key,
              variantName: variant.name,
              ...(variant.sku ? { variantSku: variant.sku } : {}),
            }
          : {}),
      },
      quantity
    );
    trackAddToCart({
      item_id: product.slug,
      item_name: product.name,
      price,
      quantity,
    });
    const btn = btnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      dispatchAddToCartEffect(null, r.left + r.width / 2, r.top);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery product={product} variantImage={selectedVariantImage} />

        <div className="space-y-4">
          {/* Badge & Title */}
          <div>
            {product.badge && (
               <Badge className="bg-primary text-primary-foreground font-bold tracking-widest text-[10px] uppercase mb-3 px-2.5 py-1 rounded">
                 {product.badge}
               </Badge>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              {product.name}
            </h1>
            {product.shortDescription && (
              <p className="mt-2 text-sm font-medium text-muted-foreground w-full max-w-[90%] leading-relaxed">
                {product.shortDescription}
              </p>
            )}
            
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {typeof product.reviewCount === "number" && product.reviewCount > 0 && (
                <a
                  href="#reviews"
                  className="flex items-center gap-2 rounded transition-colors hover:opacity-80"
                >
                  <StarRating rating={product.rating} size={18} />
                  <span className="text-sm font-bold text-foreground">
                    {product.rating ?? 0} <span className="text-primary font-medium tracking-wide">({product.reviewCount} reviews)</span>
                  </span>
                </a>
              )}

              <ProductSocialVideoModal
                productName={product.name}
                instagramUrl={product.instagramUrl}
                tiktokUrl={product.tiktokUrl}
              />
            </div>
          </div>

        {/* Price & Stock */}
        <div className="flex flex-col gap-1.5 pb-2 border-b border-border/50">
          <div className="flex flex-wrap items-end gap-3 translate-y-1">
            <span className="text-3xl font-extrabold text-foreground">{formatPrice(price)}</span>
            {discount > 0 && compareAtPrice ? (
              <>
                <span className="text-sm font-medium text-muted-foreground line-through mb-1">
                  {formatPrice(compareAtPrice)}
                </span>
                <span className="text-[13px] font-bold text-red-500 mb-1">
                  {discount}% Off
                </span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pb-2">
            Price includes VAT <Info className="w-3.5 h-3.5 opacity-60" />
          </div>
          
          <div className="mt-1 flex items-center gap-2">
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-wide">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                {stock.soldOut ? "Out of Stock" : "In Stock"}
             </div>
             {!stock.soldOut && <span className="text-xs font-medium text-muted-foreground">Ready to ship</span>}
          </div>
        </div>

        {axesOn ? (
          <VariantAxisPickers
            colorEnabled={product.colorEnabled}
            sizeEnabled={product.sizeEnabled}
            colorOptions={product.colorOptions}
            sizeOptions={product.sizeOptions}
            colorKey={colorKey}
            sizeKey={sizeKey}
            onColorKey={setColorKey}
            onSizeKey={setSizeKey}
          />
        ) : hasVariants ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Options</legend>
            <div className="flex flex-wrap gap-2">
              {product.variants!.map((v) => {
                const vStock = getVariantStockState(product, v);
                const selected = variant?._key === v._key;
                return (
                  <button
                    key={v._key ?? v.name}
                    type="button"
                    disabled={vStock.soldOut}
                    aria-pressed={selected}
                    aria-label={`${v.name}${vStock.soldOut ? " (sold out)" : ""}`}
                    onClick={() => setLegacyVariant(v)}
                    className={cn(
                      "min-h-11 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/50",
                      vStock.soldOut &&
                        "cursor-not-allowed border-dashed text-muted-foreground/50 line-through"
                    )}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {/* Quantity + Add to Cart + Buy Now */}
        <div className="flex flex-col gap-4 mt-8 pb-4 border-b border-border/50">
          {!outOfStock && (
             <div className="flex flex-col gap-2">
               <span className="text-sm font-semibold text-foreground">Quantity</span>
               <div className="flex items-center gap-3 rounded border border-border/70 px-3 py-2 w-fit bg-primary/5">
                 <button
                   onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                   className="text-foreground/70 transition-colors hover:text-foreground"
                   aria-label="Decrease quantity"
                 >
                   <Minus className="h-4 w-4" />
                 </button>
                 <span className="w-8 text-center font-bold text-sm">{quantity}</span>
                 <button
                   onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                   className="text-foreground/70 transition-colors hover:text-foreground"
                   aria-label="Increase quantity"
                 >
                   <Plus className="h-4 w-4" />
                 </button>
               </div>
             </div>
          )}
          
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_1fr] mt-2">
            <Button
              ref={btnRef}
              className="h-12 w-full rounded lg:text-[15px] font-bold tracking-wide shadow-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
              disabled={outOfStock || !selectionReady}
              onClick={handleAdd}
            >
              {added ? (
                <>
                  <Check className="h-5 w-5" strokeWidth={2.5} /> Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
                  {outOfStock ? "Sold Out" : !selectionReady ? "Choose options" : "Add to Cart"}
                </>
              )}
            </Button>
            {!outOfStock && selectionReady && (
              <div className="[&>button]:h-12 [&>button]:rounded [&>button]:border-2 [&>button]:border-primary [&>button]:bg-transparent [&>button]:text-primary hover:[&>button]:bg-primary/5 [&>button]:transition-colors [&>button]:font-bold [&>button]:text-[15px] [&>button]:tracking-wide relative">
                <BuyNow
                  product={product}
                  variant={variant}
                  quantity={quantity}
                  image={itemImage}
                />
              </div>
            )}
          </div>
          
          {/* Action Links & Social */}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full mt-3">
             <div className="flex flex-wrap items-center gap-4 sm:gap-8">
               <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group">
                 <Heart className="w-4 h-4 text-foreground/50 group-hover:text-primary transition-colors" /> Add to Wishlist
               </button>
               <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group">
                 <GitCompare className="w-4 h-4 text-foreground/50 group-hover:text-primary transition-colors" /> Compare
               </button>
               <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group">
                 <Share2 className="w-4 h-4 text-foreground/50 group-hover:text-primary transition-colors" /> Share
               </button>
             </div>
             <div className="flex items-center gap-3">
               {product.instagramUrl && (
                 <a href={product.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors" title="Watch on Instagram">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                 </a>
               )}
               {product.tiktokUrl && (
                 <a href={product.tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 text-black hover:bg-black/10 transition-colors" title="Watch on TikTok">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.34 2.88 2.88 0 0 1 2.31-4.52 2.66 2.66 0 0 1 1.04.2v-3.26a5.61 5.61 0 0 0-1.12-.11 6.34 6.34 0 0 0-6.19 7.42 6.3 6.3 0 0 0 7.82 5.2 6.37 6.37 0 0 0 4.67-6.22v-6.9a8.17 8.17 0 0 0 4.66 1.76V7.05a5 5 0 0 1-.77-.36z" /></svg>
                 </a>
               )}
             </div>
          </div>
        </div>

        {/* Figma requested Trust Features (4-block grid) */}
        {!outOfStock && (
          <div className="pt-4 mt-2 border-t border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
                 <div className="w-10 h-10 shrink-0 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Banknote className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[13px] font-bold text-foreground leading-tight">Cash on Delivery</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Pay when you receive</p>
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
                 <div className="w-10 h-10 shrink-0 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[13px] font-bold text-foreground leading-tight">1 Year Warranty</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Official Brand Warranty</p>
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
                 <div className="w-10 h-10 shrink-0 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Lock className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[13px] font-bold text-foreground leading-tight">Secure Checkout</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">100% Safe & Encrypted</p>
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
                 <div className="w-10 h-10 shrink-0 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Truck className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[13px] font-bold text-foreground leading-tight">Delivery in 1-2 Days</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Across Pakistan</p>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}