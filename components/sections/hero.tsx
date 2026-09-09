"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/sanity/image";
import { getHeroSlides, type HeroSlide } from "@/lib/demo-hero-slides";
import { getFallbackProductImage } from "@/lib/fallback-images";
import type { PublicSiteConfig } from "@/lib/site-config";
import type { HeroSection, Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function Hero({
  hero,
  products = [],
}: {
  hero: HeroSection | null;
  products?: Product[];
  config?: PublicSiteConfig;
}) {
  const slides: HeroSlide[] = getHeroSlides(hero, products);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const slideCount = slides.length;

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? slideCount - 1 : prev - 1));
  }, [slideCount]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev === slideCount - 1 ? 0 : prev + 1));
  }, [slideCount]);

  // Autoplay
  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;

    // Respect reduced motion preference
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(() => {
      goToNext();
    }, 5500);

    return () => clearInterval(timer);
  }, [slideCount, isPaused, goToNext]);

  // Handle Touch Swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }

  const currentSlide = slides[activeIndex] || slides[0];
  const featured = currentSlide.featuredProduct ?? null;
  const primaryHref =
    currentSlide.primaryCta?.href ||
    (featured ? `/product/${featured.slug}` : "/products");
  const primaryLabel = currentSlide.primaryCta?.label || "Shop Now";

  const image =
    currentSlide.image ||
    (featured?.images?.[0] ?? featured?.cloudinaryImages?.[0]);
  let resolvedImageSrc = imageUrl(image, { w: 2400 });
  if (!resolvedImageSrc && featured) {
    resolvedImageSrc = getFallbackProductImage(featured);
  } else if (
    !resolvedImageSrc &&
    currentSlide.image &&
    typeof currentSlide.image === "string"
  ) {
    resolvedImageSrc = currentSlide.image;
  }

  const discount =
    featured &&
    featured.compareAtPrice &&
    featured.compareAtPrice > featured.price
      ? Math.round(
          ((featured.compareAtPrice - featured.price) /
            featured.compareAtPrice) *
            100,
        )
      : 0;

  return (
    <section
      className="relative w-full bg-background overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full relative">
        <div className="relative overflow-hidden bg-gradient-to-br from-secondary/40 via-secondary/15 to-background flex items-center">
          {/* Active slide layout container with elegant clean transition */}
          <div
            key={activeIndex}
            className="w-full h-full animate-premium-fade flex items-center"
          >
            {resolvedImageSrc && !featured ? (
              /* Banner layout */
              <Link
                href={primaryHref}
                className="relative block w-full h-[60vh] min-h-[450px] lg:h-[80vh] lg:min-h-[600px] group"
              >
                <Image
                  src={resolvedImageSrc}
                  alt={currentSlide.alt}
                  fill
                  priority={activeIndex === 0}
                  sizes="100vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                />
                {/* Overlay shadow for text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent flex flex-col justify-center items-start">
                  <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 md:px-16 flex flex-col justify-center max-w-2xl">
                    {currentSlide.headline && (
                      <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight animate-premium-slide">
                        {currentSlide.headline}
                      </h2>
                    )}
                    {currentSlide.subheadline && (
                      <p className="mt-4 text-base sm:text-lg md:text-xl text-muted-foreground font-medium animate-premium-slide [animation-delay:150ms] fill-mode-forward">
                        {currentSlide.subheadline}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              /* Split layout - Clean Precision Tech Style */
              <div className="w-full h-full relative overflow-hidden bg-background flex items-center">
                {/* Left Subtle Background - Desktop/Tablet */}
                <div
                  className="absolute top-0 bottom-0 left-0 w-[100%] sm:w-[65%] lg:w-[50%] bg-secondary/30 z-10 hidden sm:block border-r border-border/40"
                  style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}
                ></div>
                {/* Left Subtle Background - Mobile */}
                <div
                  className="absolute top-0 left-0 right-0 h-[65%] w-full bg-secondary/30 z-10 sm:hidden border-b border-border/40"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 90%, 0 100%)" }}
                ></div>

                <div className="w-full max-w-[1920px] mx-auto h-[60vh] min-h-[450px] lg:h-[80vh] lg:min-h-[600px] z-20 relative p-6 sm:p-10 md:p-16 flex flex-col sm:flex-row items-center gap-10">
                  {/* Left Column Text Content */}
                  <div className="flex-1 w-full flex flex-col items-start justify-center max-w-xl">
                    <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary animate-premium-slide border border-primary/20">
                      Fast. Reliable. Everyday.
                    </div>
                    {currentSlide.headline && (
                      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-foreground animate-premium-slide">
                        {currentSlide.headline ===
                        "Power That Moves With You." ? (
                          <>
                            Power That <br className="hidden lg:block" />
                            <span className="text-primary">
                              Moves With You.
                            </span>
                          </>
                        ) : (
                          currentSlide.headline
                        )}
                      </h1>
                    )}
                    {currentSlide.subheadline && (
                      <p className="mt-4 text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed font-medium animate-premium-slide [animation-delay:150ms] fill-mode-forward max-w-md">
                        {currentSlide.subheadline}
                      </p>
                    )}
                    <div className="mt-8 flex flex-wrap gap-4 animate-premium-slide [animation-delay:300ms] fill-mode-forward">
                      <Button
                        asChild
                        className="rounded-full px-10 py-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
                      >
                        <Link href={primaryHref}>{primaryLabel}</Link>
                      </Button>
                      {currentSlide.secondaryCta && (
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-full px-10 py-6 text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02] bg-background"
                        >
                          <Link href={currentSlide.secondaryCta.href || "#"}>
                            {currentSlide.secondaryCta.label}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right Column Product Visual Area */}
                  <div className="flex-1 w-full relative flex flex-col items-center justify-center animate-premium-slide [animation-delay:200ms] fill-mode-forward mt-4 sm:mt-0">
                    <Link
                      href={primaryHref}
                      className="group relative block w-full max-w-md lg:max-w-xl aspect-square"
                    >
                      {image ? (
                        <Image
                          src={imageUrl(image, { w: 1000 })}
                          alt={
                            featured?.name ||
                            currentSlide.headline ||
                            "Featured product"
                          }
                          fill
                          priority={activeIndex === 0}
                          sizes="(max-width: 1024px) 100vw, 800px"
                          className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)] transition-transform duration-700 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_30px_50px_rgba(0,0,0,0.35)]"
                        />
                      ) : null}

                      {/* Floating Info tag if featured */}
                      {featured && (
                        <div className="absolute right-0 bottom-10 bg-background/95 backdrop-blur shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col items-start gap-1 border border-border/50 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                          <p className="font-bold text-foreground truncate max-w-[200px]">
                            {featured.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-primary">
                              {formatPrice(featured.price)}
                            </span>
                            {discount > 0 && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(featured.compareAtPrice!)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Previous / Next Slider Arrow Navigation - Sleek accessories hub styling */}
          {slideCount > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToPrev();
                }}
                aria-label="Previous slide"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/80 backdrop-blur-md text-foreground shadow-sm transition-all duration-300 hover:bg-background hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 lg:group-hover:opacity-100 pointer-events-auto"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToNext();
                }}
                aria-label="Next slide"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/80 backdrop-blur-md text-foreground shadow-sm transition-all duration-300 hover:bg-background hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 lg:group-hover:opacity-100 pointer-events-auto"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Pagination Indicators / Dots */}
          {slideCount > 1 && (
            <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2 pointer-events-auto">
              {slides.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveIndex(i);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className={`transition-all duration-300 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    i === activeIndex
                      ? "h-2 w-7 bg-primary shadow-sm"
                      : "h-2 w-2 bg-foreground/20 hover:bg-foreground/45"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
