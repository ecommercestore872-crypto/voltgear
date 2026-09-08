"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";

import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { resolveSlideCta } from "@/lib/db/hero-slide-rules";
import type { GadgetCreativeBanner } from "@/lib/gadget-creatives";
import { product2Href } from "@/lib/gadget-preview";
import type { HeroSlide } from "@/lib/types";

const INTERVAL_MS = 5500;
const FADE_MS = 700;

export type GadgetHeroBanner = {
  id: string;
  title: string;
  imageUrl: string;
  href: string;
  ctaDisabled?: boolean;
};

function fromAdminSlides(slides: HeroSlide[]): GadgetHeroBanner[] {
  return slides.map((slide) => {
    const cta = resolveSlideCta(slide.product.stockStatus);
    return {
      id: slide.id,
      title: slide.title || "Campaign",
      imageUrl: slide.imageUrl,
      href: product2Href(slide.product.slug),
      ctaDisabled: cta.disabled,
    };
  });
}

export function GadgetHeroSlider({
  slides = [],
  fallbackBanners = [],
}: {
  slides?: HeroSlide[];
  fallbackBanners?: GadgetCreativeBanner[];
}) {
  const banners: GadgetHeroBanner[] =
    slides.length > 0
      ? fromAdminSlides(slides)
      : fallbackBanners.map((b) => ({
          id: b.id,
          title: b.title,
          imageUrl: b.imageUrl,
          href: b.href,
        }));

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [banners.length, paused, reduceMotion]);

  if (banners.length === 0) {
    return (
      <div className="bg-[var(--g-cream)] px-4 py-10 lg:px-8">
        <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] px-4 py-16 text-center">
          <p className="text-sm text-[var(--g-taupe)]">
            No published hero slides yet. Add a full campaign banner image in Admin → Hero.
          </p>
        </div>
      </div>
    );
  }

  const active = banners[index] ?? banners[0];

  function prev() {
    setPaused(false);
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  }

  function next() {
    setPaused(false);
    setIndex((i) => (i + 1) % banners.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartTime.current = Date.now();
    setPaused(true);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartTime.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dx) / dt; // px/ms
    const isSwipe = Math.abs(dx) > 40 || velocity > 0.3;
    if (isSwipe) {
      dx < 0 ? next() : prev();
    } else {
      setPaused(false);
    }
    touchStartX.current = null;
    touchStartTime.current = null;
  }

  return (
    <section
      className="bg-[var(--g-cream)] px-3 pt-3 pb-2 sm:px-4 sm:pt-4 lg:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Campaign banners"
    >
      <div className="group relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-[var(--g-line)] bg-[var(--g-forest)] shadow-[0_20px_50px_rgba(31,54,38,0.18)]">
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/9] lg:aspect-[2.4/1] lg:min-h-[340px] lg:max-h-[28rem]">
          {banners.map((banner, i) => {
            const isActive = i === index;
            const shouldPaint = isActive || i === 0;
            return (
              <div
                key={banner.id}
                className="absolute inset-0"
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: reduceMotion
                    ? "opacity 1ms"
                    : `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  zIndex: isActive ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                }}
                aria-hidden={!isActive}
              >
                {shouldPaint ? (
                  <Image
                    src={banner.imageUrl}
                    alt=""
                    fill
                    priority={i === 0}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    quality={70}
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1152px"
                  />
                ) : null}
              </div>
            );
          })}

          {/* Vignette Overlay */}
          <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-transparent to-black/10" />

          {/* Left / Right Arrow Navigation (Visible on Hover / Focus) */}
          {banners.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 z-[10] -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 z-[10] -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          {/* Bottom Bar: Title, Progress Indicators & CTA */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex flex-wrap items-end justify-between gap-3 p-4 sm:p-6">
            <div className="pointer-events-auto flex flex-col gap-2 max-w-[min(100%,32rem)]">
              {active.title ? (
                <p className="gadget-display text-left text-lg font-bold leading-tight tracking-[-0.02em] text-white drop-shadow-md sm:text-xl lg:text-2xl">
                  {active.title}
                </p>
              ) : null}

              {/* Progress Indicators */}
              <div className="flex items-center gap-2">
                {banners.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className="relative flex h-6 items-center focus:outline-none"
                  >
                    <span
                      className={`relative block h-1.5 rounded-full overflow-hidden transition-colors duration-300 ${
                        i === index ? "w-10 bg-white/40" : "w-3 bg-white/30 hover:bg-white/60"
                      }`}
                    >
                      {i === index && !paused ? (
                        <span
                          className="absolute inset-y-0 left-0 w-full bg-[var(--g-amber)] rounded-full animate-progress"
                          style={{
                            animationDuration: `${INTERVAL_MS}ms`,
                            animationTimingFunction: "linear",
                            animationFillMode: "forwards",
                          }}
                        />
                      ) : i === index ? (
                        <span className="absolute inset-0 bg-[var(--g-amber)] rounded-full" />
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            {!active.ctaDisabled ? (
              <Link
                href={active.href}
                className="pointer-events-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#f0b429] px-5 py-2 text-xs font-black uppercase tracking-wider text-[#1a1a1a] shadow-[0_8px_20px_rgba(245,166,35,0.4)] transition-all hover:scale-105 hover:bg-[#f5c14d] sm:px-6 sm:text-sm"
              >
                <ShoppingCart className="h-4 w-4 stroke-[2.5]" aria-hidden />
                <span className="max-w-[16ch] truncate sm:max-w-none">
                  Shop {active.title || "this offer"}
                </span>
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-full bg-white/20 backdrop-blur-md px-5 text-xs font-bold uppercase tracking-wide text-white border border-white/20">
                Out of stock
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
