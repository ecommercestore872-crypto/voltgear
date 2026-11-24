"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageOff, Play } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { galleryVideoForProduct } from "@/lib/product-gallery-video";
import {
  ProductGalleryEmbed,
  ProductGalleryVideo,
} from "@/components/product/product-gallery-video";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type GallerySource = {
  src: string;
  thumb: string;
  alt: string;
  /** Set on the video slide only; src/thumb then hold the poster (may be empty). */
  video?: { kind: "file" | "instagram" | "tiktok"; src: string; openHref?: string };
};

/** 3× zoom factor for the hover magnifier lens */
const ZOOM = 3;
/** Size of the floating zoom panel in pixels */
const LENS_SIZE = 300;

export function ProductGallery({
  product,
  variantImage,
}: {
  product: Product;
  variantImage?: GallerySource | null;
}) {
  const imageSources: GallerySource[] = [
    ...(variantImage ? [variantImage] : []),
    ...(product.images ?? []).map((img) => ({
      src: imageUrl(img, { w: PRODUCT_IMAGE.gallery }),
      thumb: imageUrl(img, { w: PRODUCT_IMAGE.thumb }),
      alt: product.name,
    })),
    ...(product.cloudinaryImages ?? []).map((id) => ({
      src: cloudinaryImageUrl(id, { w: PRODUCT_IMAGE.gallery }),
      thumb: cloudinaryImageUrl(id, { w: PRODUCT_IMAGE.thumb }),
      alt: `${product.name} (gallery image)`,
    })),
  ];

  // Video is the 2nd slide so the first image stays the LCP element and loads alone.
  const galleryVideo = galleryVideoForProduct(product);
  const sources: GallerySource[] = [...imageSources];
  if (galleryVideo) {
    const poster = galleryVideo.poster
      ? {
          src: imageUrl(galleryVideo.poster, { w: PRODUCT_IMAGE.gallery }),
          thumb: imageUrl(galleryVideo.poster, { w: PRODUCT_IMAGE.thumb }),
        }
      : { src: "", thumb: "" };
    sources.splice(Math.min(1, sources.length), 0, {
      ...poster,
      alt: `${product.name} (video)`,
      video: { kind: galleryVideo.kind, src: galleryVideo.src, openHref: galleryVideo.openHref },
    });
  }
  const lightboxSources = sources.filter((s) => !s.video);

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Zoom state
  const [zoomed, setZoomed] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState({ x: 50, y: 50 });
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    setActive(0);
    setLightboxIndex(0);
    setZoomed(false);
  }, [variantImage?.src]);

  // Detect touch device once on mount
  useEffect(() => {
    isTouchDevice.current = window.matchMedia("(hover: none)").matches;
  }, []);

  const current = sources[Math.min(active, sources.length - 1)];
  const lb = lightboxSources.length
    ? lightboxSources[Math.min(Math.max(0, lightboxIndex), lightboxSources.length - 1)]
    : null;

  const goTo = useCallback(
    (index: number) => {
      const next = (index + sources.length) % sources.length;
      setActive(next);
    },
    [sources.length],
  );

  function openLightbox() {
    if (!current || current.video) return;
    setLightboxIndex(Math.max(0, lightboxSources.indexOf(current)));
    setLightboxOpen(true);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isTouchDevice.current || !imgContainerRef.current || current?.video) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = Math.max(0, Math.min(1, x / rect.width));
    const yPct = Math.max(0, Math.min(1, y / rect.height));

    // Clamp the lens panel so it stays fully inside the image container
    const halfLens = LENS_SIZE / 2;
    const clampedX = Math.max(halfLens, Math.min(rect.width - halfLens, x));
    const clampedY = Math.max(halfLens, Math.min(rect.height - halfLens, y));

    setLensPos({ x: clampedX, y: clampedY });
    setBgPos({ x: xPct * 100, y: yPct * 100 });
  }

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div
        ref={imgContainerRef}
        className={cn(
          "relative touch-pan-y overflow-hidden rounded-xl border bg-[var(--g-cream-deep,#f5f5f5)] select-none",
          current?.video && current.video.kind !== "file"
            ? "mx-auto aspect-[9/16] w-full max-w-[360px]"
            : "aspect-square",
          zoomed && !isTouchDevice.current
            ? "cursor-crosshair"
            : "cursor-zoom-in",
        )}
        onClick={() => {
          if (isTouchDevice.current && !current?.video) openLightbox();
        }}
        onMouseEnter={() => {
          if (!isTouchDevice.current && current && !current.video) setZoomed(true);
        }}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
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
        role={current?.video ? undefined : "img"}
        aria-label={current?.alt ?? product.name}
      >
        {current?.video ? (
          <div
            className="absolute inset-0"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {current.video.kind === "file" ? (
              <ProductGalleryVideo
                key={current.video.src}
                src={current.video.src}
                poster={current.src || undefined}
                label={`${product.name} video`}
              />
            ) : (
              <ProductGalleryEmbed
                key={current.video.src}
                src={current.video.src}
                poster={current.src || undefined}
                label={`${product.name} video`}
                platform={current.video.kind}
                openHref={current.video.openHref}
              />
            )}
          </div>
        ) : current ? (
          <Image
            src={current.src}
            alt={current.alt}
            fill
            priority
            quality={75}
            sizes="(max-width: 1024px) 100vw, min(600px, 50vw)"
            className="object-contain pointer-events-none"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <span className="text-sm">No image uploaded</span>
          </div>
        )}

        {/* ✨ Desktop Hover Zoom Lens Panel */}
        {zoomed && current && (
          <div
            className="pointer-events-none absolute z-30 rounded-xl border-2 border-white/60 shadow-2xl overflow-hidden ring-2 ring-[var(--g-forest)]/30"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              left: lensPos.x - LENS_SIZE / 2,
              top: lensPos.y - LENS_SIZE / 2,
              backgroundImage: `url(${current.src})`,
              backgroundSize: `${ZOOM * 100}%`,
              backgroundPosition: `${bgPos.x}% ${bgPos.y}%`,
              backgroundRepeat: "no-repeat",
            }}
            aria-hidden
          >
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
              {ZOOM}×
            </span>
          </div>
        )}

        {/* Expand button (lightbox) — hidden while zoom lens is active */}
        {sources.length > 0 && !zoomed && !current?.video && (
          <button
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur z-10 hover:bg-background transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox();
            }}
            aria-label="Open fullscreen image viewer"
          >
            <Expand className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {sources.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
          {sources.map((source, i) => (
            <button
              key={`${source.thumb}-${i}`}
              onClick={() => {
                setActive(i);
                setZoomed(false);
              }}
              aria-label={
                source.video ? "Play product video" : `View image ${i + 1}`
              }
              aria-current={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all",
                i === active
                  ? "border-primary ring-2 ring-primary/40"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              {source.thumb ? (
                <Image
                  src={source.thumb}
                  alt=""
                  fill
                  sizes="15vw"
                  className="object-cover"
                />
              ) : null}
              {source.video ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
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
                  quality={75}
                  className="object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No image</p>
            )}
          </div>
          {lightboxSources.length > 1 && (
            <>
              <button
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + lightboxSources.length) % lightboxSources.length,
                  )
                }
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-white transition-colors hover:bg-background/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() =>
                  setLightboxIndex((lightboxIndex + 1) % lightboxSources.length)
                }
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-white transition-colors hover:bg-background/20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="text-center text-sm text-white/70">
                {lightboxIndex + 1} / {lightboxSources.length}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
