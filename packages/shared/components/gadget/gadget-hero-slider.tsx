"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart, Volume2, VolumeX } from "lucide-react";

import type { GadgetCreativeBanner } from "@/lib/gadget-creatives";
import {
  fallbackHeroBanners,
  heroSlidesToBanners,
  type GadgetHeroBanner,
} from "@/lib/gadget-hero-banners";
import type { HeroSlide } from "@/lib/types";

const INTERVAL_MS = 25000;
const FADE_MS = 700;

export type { GadgetHeroBanner } from "@/lib/gadget-hero-banners";

export function GadgetHeroSlider({
  banners: precomputedBanners,
  slides = [],
  fallbackBanners = [],
}: {
  banners?: GadgetHeroBanner[];
  slides?: HeroSlide[];
  fallbackBanners?: GadgetCreativeBanner[];
}) {
  const banners: GadgetHeroBanner[] =
    precomputedBanners && precomputedBanners.length > 0
      ? precomputedBanners
      : slides.length > 0
        ? heroSlidesToBanners(slides)
        : fallbackHeroBanners(fallbackBanners);

  const [index, setIndex] = useState(0);
  const [hasChangedSlide, setHasChangedSlide] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [muted, setMuted] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReduceMotion(true);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setHasChangedSlide(true);
      setIndex((i) => (i + 1) % banners.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [banners.length, paused, reduceMotion]);

  if (banners.length === 0) {
    return (
      <div className="bg-[var(--g-cream)] px-4 py-10 lg:px-8">
        <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] px-4 py-16 text-center">
          <p className="text-sm text-[var(--g-taupe)]">
            No published hero slides yet. Add a full campaign banner image in
            Admin → Hero.
          </p>
        </div>
      </div>
    );
  }

  const active = banners[index] ?? banners[0];

  function prev() {
    setHasChangedSlide(true);
    setPaused(false);
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  }

  function next() {
    setHasChangedSlide(true);
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
      className="bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Campaign banners"
    >
      <div className="gadget-hero-shell group relative overflow-hidden bg-black">
        <div className="relative h-[72svh] min-h-[520px] max-h-[860px] w-full sm:h-[76svh]">
          {banners.map((banner, i) => {
            const isActive = i === index;
            const shouldPaint = isActive || i === 0;
            return (
              <div
                key={banner.id}
                className="absolute inset-0"
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: !hasChangedSlide || reduceMotion
                    ? "none"
                    : `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  zIndex: isActive ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                  contain: "paint",
                  willChange: hasChangedSlide && isActive ? "opacity" : "auto",
                }}
                aria-hidden={!isActive}
              >
                {shouldPaint ? (
                  <>
                    {banner.videoUrl && !reduceMotion ? (
                      <>
                        <video
                          key={`${banner.id}-${isActive}`}
                          autoPlay={isActive}
                          muted={muted}
                          loop
                          playsInline
                          preload={i === 0 ? "auto" : "metadata"}
                          poster={banner.imageUrl}
                          className="absolute inset-0 z-[1] hidden h-full w-full object-cover sm:block"
                          aria-hidden
                        >
                          <source src={banner.videoUrl} />
                        </video>
                        <video
                          key={`${banner.id}-mobile-${isActive}`}
                          autoPlay={isActive}
                          muted={muted}
                          loop
                          playsInline
                          preload={i === 0 ? "auto" : "metadata"}
                          poster={banner.mobileImageUrl || banner.imageUrl}
                          className="absolute inset-0 z-[1] h-full w-full object-cover sm:hidden"
                          aria-hidden
                        >
                          <source src={banner.mobileVideoUrl || banner.videoUrl} />
                        </video>
                      </>
                    ) : banner.mobileImageUrl ? (
                      <picture className="absolute inset-0 z-[1] block h-full w-full pointer-events-none select-none">
                        <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} width={640} height={928} />
                        <img
                          src={banner.imageUrl}
                          alt=""
                          width={1280}
                          height={800}
                          fetchPriority={i === 0 ? "high" : "auto"}
                          decoding={i === 0 ? "sync" : "async"}
                          className="h-full w-full object-cover object-center"
                        />
                      </picture>
                    ) : (
                      <img
                        src={banner.imageUrl}
                        alt=""
                        width={1200}
                        height={800}
                        fetchPriority={i === 0 ? "high" : "auto"}
                        decoding={i === 0 ? "sync" : "async"}
                        className="absolute inset-0 z-[1] h-full w-full object-cover object-center pointer-events-none select-none"
                      />
                    )}
                  </>
                ) : null}
              </div>
            );
          })}

          {/* Vignette Overlay: only if there's text */}
          {(active.title || active.subtitle || active.ctaLabel) ? (
            <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(0,0,0,.24)_0%,transparent_38%,rgba(0,0,0,.78)_100%)]" />
          ) : null}
          {active.videoUrl ? (
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? "Turn hero sound on" : "Mute hero video"}
              className="absolute right-4 top-4 z-[10] flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          ) : null}

          {/* Left / Right Arrow Navigation (Visible on Hover / Focus) */}
          {banners.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 z-[10] -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/65 text-white border border-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity hover:bg-black/80"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 z-[10] -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/65 text-white border border-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity hover:bg-black/80"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
          {/* Bottom Bar: Title, Progress Indicators & CTA */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex flex-wrap items-end justify-between gap-5 p-5 pb-8 sm:p-10 lg:px-16 lg:pb-14">
            <div className="pointer-events-auto flex flex-col gap-2 max-w-[min(100%,32rem)]">
              {active.title ? (
                <p className="gadget-display text-left text-3xl font-bold leading-[0.95] tracking-[-0.04em] text-white drop-shadow-md sm:text-5xl lg:text-7xl">
                  {active.title}
                </p>
              ) : null}
              {active.subtitle ? (
                <p className="max-w-[40ch] text-left text-sm text-white/90 drop-shadow sm:text-base">
                  {active.subtitle}
                </p>
              ) : null}

              {/* Progress Indicators */}
              <div className="flex items-center gap-2">
                {banners.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => {
                      setHasChangedSlide(true);
                      setIndex(i);
                    }}
                    className="relative inline-flex min-h-[44px] min-w-[28px] items-center justify-center p-2 focus:outline-none"
                  >
                    <span
                      className={`relative block h-1.5 rounded-full overflow-hidden transition-colors duration-300 ${
                        i === index
                          ? "w-10 bg-white/40"
                          : "w-3 bg-white/30 hover:bg-white/60"
                      }`}
                    >
                      {i === index ? (
                        <span className="absolute inset-0 bg-[var(--g-amber)] rounded-full" />
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            {!active.ctaDisabled ? (
              active.ctaLabel ? (
                <Link
                  href={active.href}
                  prefetch={false}
                  className="gadget-hero-cta pointer-events-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider sm:px-6 sm:text-sm"
                >
                  <ShoppingCart className="h-4 w-4 stroke-[2.5]" aria-hidden />
                  <span className="max-w-[16ch] truncate sm:max-w-none">
                    {active.ctaLabel}
                  </span>
                </Link>
              ) : null
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-full bg-white/20 backdrop-blur-md px-5 text-xs font-bold uppercase tracking-wide text-white border border-white/20">
                Out of stock
              </span>
            )}
          </div>
        </div>
        
        {/* Invisible link covering entire banner if no button is used */}
        {(!active.ctaLabel || active.title === "") && active.href ? (
          <Link href={active.href} prefetch={false} className="absolute inset-0 z-[5]" aria-label="View product" />
        ) : null}
      </div>
    </section>
  );
}
