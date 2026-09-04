"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type GallerySource = { src: string; thumb: string; alt: string };

export function ProductGallery({
  product,
  variantImage,
}: {
  product: Product;
  variantImage?: GallerySource | null;
}) {
  const sources: GallerySource[] = [
    ...(variantImage ? [variantImage] : []),
    ...(product.cloudinaryImages ?? []).map((id) => ({
      src: cloudinaryImageUrl(id, { w: PRODUCT_IMAGE.gallery }),
      thumb: cloudinaryImageUrl(id, { w: PRODUCT_IMAGE.thumb }),
      alt: `${product.name} (gallery image)`,
    })),
    ...(product.images ?? []).map((img) => ({
      src: imageUrl(img, { w: PRODUCT_IMAGE.gallery }),
      thumb: imageUrl(img, { w: PRODUCT_IMAGE.thumb }),
      alt: product.name,
    })),
  ];

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActive(0);
    setLightboxIndex(0);
  }, [variantImage?.src]);

  const current = sources[Math.min(active, sources.length - 1)];
  const lb = sources.length
    ? sources[Math.min(Math.max(0, lightboxIndex), sources.length - 1)]
    : null;

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;

  const goTo = useCallback(
    (index: number) => {
      const next = (index + sources.length) % sources.length;
      setActive(next);
      setLightboxIndex(next);
    },
    [sources.length]
  );

  function openLightbox() {
    if (!current) return;
    setLightboxIndex(active);
    setLightboxOpen(true);
  }

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-square cursor-zoom-in touch-pan-y overflow-hidden rounded-xl border bg-[var(--g-cream-deep,#f5f5f5)] select-none"
        onClick={openLightbox}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(e) => {
          if (touchStartX.current === null) return;
          const delta = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(delta) > 40) {
            goTo(delta < 0 ? active + 1 : active - 1);
            touchStartX.current = null;
          }
        }}
        onTouchEnd={() => {
          touchStartX.current = null;
        }}
        role="button"
        aria-label="Open image viewer"
      >
        {current ? (
          <Image
            src={current.src}
            alt={current.alt}
            fill
            priority
            quality={90}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <span className="text-sm">No image uploaded</span>
          </div>
        )}
        {discount > 0 && (
          <Badge className="absolute left-4 top-4 bg-destructive text-white">
            Save {discount}%
          </Badge>
        )}
        {sources.length > 0 && (
          <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur">
            <Expand className="h-4 w-4" />
          </span>
        )}
      </div>

      {sources.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {sources.map((source, i) => (
            <button
              key={`${source.thumb}-${i}`}
              onClick={() => {
                setActive(i);
                setLightboxIndex(i);
              }}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all",
                i === active
                  ? "border-primary ring-2 ring-primary/40"
                  : "opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={source.thumb}
                alt=""
                fill
                sizes="15vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl bg-black/90">
          <DialogTitle className="sr-only">
            {product.name} image viewer
          </DialogTitle>
          <div className="flex items-center justify-center py-4">
            {lb ? (
              <div className="relative aspect-square w-full max-w-xl">
                <Image
                  src={lb.src}
                  alt={lb.alt}
                  fill
                  sizes="(max-width: 768px) 90vw, 700px"
                  quality={90}
                  className="object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No image</p>
            )}
          </div>
          {sources.length > 1 && (
            <>
              <button
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + sources.length) % sources.length
                  )
                }
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-white transition-colors hover:bg-background/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() =>
                  setLightboxIndex((lightboxIndex + 1) % sources.length)
                }
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-white transition-colors hover:bg-background/20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="text-center text-sm text-white/70">
                {lightboxIndex + 1} / {sources.length}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}