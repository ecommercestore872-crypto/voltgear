"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { cloudinaryLoader } from "@/lib/cloudinary";
import type { GadgetCreativeBanner } from "@/lib/gadget-creatives";
import {
  fallbackHeroBanners,
  heroSlidesToBanners,
  type GadgetHeroBanner,
} from "@/lib/gadget-hero-banners";
import type { HeroSlide } from "@/lib/types";

const INTERVAL_MS = 7000;
const FADE_MS = 600;

export type { GadgetHeroBanner } from "@/lib/gadget-hero-banners";

function ResponsiveHeroImage({
  banner,
  eager,
}: {
  banner: GadgetHeroBanner;
  eager: boolean;
}) {
  if (!banner.mobileImageUrl) {
    return (
      <Image
        loader={cloudinaryLoader}
        src={banner.imageUrl}
        alt=""
        fill
        unoptimized={banner.imageUrl.startsWith("/")}
        priority={eager}
        fetchPriority={eager ? "high" : "auto"}
        quality={eager ? 65 : 72}
        className={banner.artworkText ? "object-contain z-[1]" : "object-cover object-[68%_center] sm:object-center z-[1]"}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 94vw, 1800px"
      />
    );
  }

  const mobile = getImageProps({
    loader: cloudinaryLoader,
    src: banner.mobileImageUrl,
    alt: "",
    fill: true,
    unoptimized: banner.mobileImageUrl.startsWith("/"),
    priority: eager,
    fetchPriority: eager ? "high" : "auto",
    quality: eager ? 62 : 70,
    sizes: "100vw",
  }).props;
  const desktop = getImageProps({
    loader: cloudinaryLoader,
    src: banner.imageUrl,
    alt: "",
    fill: true,
    unoptimized: banner.imageUrl.startsWith("/"),
    priority: eager,
    fetchPriority: eager ? "high" : "auto",
    quality: eager ? 65 : 72,
    sizes: "(max-width: 1024px) 94vw, 1800px",
  }).props;

  return (
    <picture>
      <source
        media="(min-width: 640px)"
        srcSet={desktop.srcSet ?? desktop.src}
        sizes={desktop.sizes}
      />
      <img {...mobile} className={banner.artworkText ? "object-contain z-[1]" : "object-cover object-[68%_center] sm:object-center z-[1]"} />
    </picture>
  );
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
      ? heroSlidesToBanners(slides)
      : fallbackHeroBanners(fallbackBanners);

  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
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
    const onVisibility = () => setHidden(document.visibilityState !== "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const paused = hovered || focused || hidden || reduceMotion;

  useEffect(() => {
    if (banners.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [banners.length, paused, reduceMotion]);

  if (banners.length === 0) {
    return (
      <div className="px-4 py-10 lg:px-8">
        <div className="rounded-[1.5rem] bg-[var(--g-white)] px-4 py-16 text-center">
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
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  }

  function next() {
    setIndex((i) => (i + 1) % banners.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartTime.current = Date.now();
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartTime.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dx) / dt; // px/ms
    const isSwipe = Math.abs(dx) > 40 || velocity > 0.3;
    if (isSwipe) {
      dx < 0 ? next() : prev();
    }
    touchStartX.current = null;
    touchStartTime.current = null;
  }

  return (
    <section
      className="login-hero-pull relative px-2 pb-4 pt-2 sm:px-5 sm:pb-7 sm:pt-5 lg:px-5 lg:pt-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); prev(); }
        if (event.key === "ArrowRight") { event.preventDefault(); next(); }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      tabIndex={0}
    >
      <div className="gadget-hero-shell group relative mx-auto max-w-[120rem] overflow-hidden rounded-[1.5rem] bg-[var(--g-forest)] sm:rounded-[1.75rem]">
        <div className="relative h-[min(68svh,600px)] min-h-[460px] w-full sm:h-[520px] sm:min-h-0 lg:h-[min(84svh,780px)] lg:min-h-[560px]">
          {banners.map((banner, i) => {
            const isActive = i === index;
            const shouldPaint = isActive || i === 0;
            return (
              <div
                key={banner.id}
                className={banner.artworkText ? "absolute inset-x-0 top-0 bottom-28 sm:bottom-20" : "absolute inset-0"}
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: reduceMotion
                    ? "none"
                    : `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  zIndex: isActive ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                }}
                aria-hidden={!isActive}
              >
                {shouldPaint && !banner.textOnly ? (
                  <ResponsiveHeroImage banner={banner} eager={i === 0} />
                ) : null}
              </div>
            );
          })}

          {/* A fixed overlay keeps the copy readable without changing contrast on slide transitions. */}
          {!active.artworkText && (active.title || active.subtitle || active.ctaLabel) ? (
            <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(0deg,rgba(8,27,19,.96)_0%,rgba(8,27,19,.46)_47%,rgba(8,27,19,.08)_100%)] sm:bg-[linear-gradient(90deg,rgba(8,27,19,1)_0%,rgba(8,27,19,1)_42%,rgba(8,27,19,.94)_53%,rgba(8,27,19,.08)_82%)]" />
          ) : null}

          {/* Controls remain visible for touch, keyboard and pointer users. */}
          {banners.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="absolute left-3 top-[30%] z-[10] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--g-forest)] shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-7 sm:left-auto sm:right-20 sm:top-auto sm:translate-y-0"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="absolute right-3 top-[30%] z-[10] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--g-forest)] shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-7 sm:right-7 sm:top-auto sm:translate-y-0"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
          {banners.length > 1 ? (
            <div
              className="absolute inset-x-0 bottom-2 z-[6] flex items-center justify-center sm:bottom-3"
              aria-label="Choose featured collection"
            >
              {banners.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  aria-current={i === index ? "true" : undefined}
                  className="flex h-11 w-6 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      i === index ? "w-7 bg-white" : "w-2 bg-white/55"
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : null}
          <div className={active.artworkText
            ? "pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex min-h-28 flex-col items-center justify-center gap-1 bg-[var(--g-forest)] px-4 sm:h-20 sm:min-h-0 sm:flex-row sm:justify-between sm:px-8"
            : "pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex flex-col items-start gap-4 px-6 pb-14 pt-20 sm:bottom-auto sm:top-1/2 sm:max-w-[58%] sm:-translate-y-1/2 sm:px-12 sm:py-0 lg:px-20"}>
            <div className={active.artworkText
              ? "pointer-events-auto flex items-center"
              : "pointer-events-auto flex max-w-[min(100%,35rem)] flex-col items-start gap-3"}>
              <span className={active.artworkText ? "sr-only" : "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:text-[11px] sm:tracking-[0.24em]"}>{active.eyebrow || "The Buy N Try edit"}</span>
              {active.title ? (
                <h1 className={active.artworkText ? "sr-only" : "gadget-display text-left text-[clamp(2.6rem,7vw,5rem)] font-medium leading-[1.04] tracking-[-0.04em] text-white"}>
                  {active.title}
                </h1>
              ) : null}
              {active.subtitle ? (
                <p className={active.artworkText ? "sr-only" : "max-w-[36ch] text-left text-sm leading-relaxed text-white/90 sm:text-base"}>
                  {active.subtitle}
                </p>
              ) : null}
            </div>

            {!active.ctaDisabled ? (
              active.ctaLabel && active.href ? (
                <Link
                  href={active.href}
                  className="gadget-hero-cta pointer-events-auto inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full px-6 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors sm:text-sm"
                >
                  <span>
                    {active.ctaLabel}
                  </span>
                  <ArrowRight className="h-4 w-4 stroke-[2]" aria-hidden />
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
          <Link href={active.href} className="absolute inset-0 z-[5]" aria-label="View product" />
        ) : null}
      </div>
    </section>
  );
}
