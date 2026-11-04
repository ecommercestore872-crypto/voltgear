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
        className="object-cover object-[68%_center] sm:object-center z-[1]"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1280px"
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
    sizes: "(max-width: 1024px) 90vw, 1280px",
  }).props;

  return (
    <picture>
      <source
        media="(min-width: 640px)"
        srcSet={desktop.srcSet}
        sizes={desktop.sizes}
      />
      <img {...mobile} className="object-cover object-[68%_center] sm:object-center z-[1]" />
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
      <div className="bg-[var(--g-cream)] px-4 py-10 lg:px-8">
        <div className="rounded-[12px] border border-[var(--g-line)] bg-[var(--g-white)] px-4 py-16 text-center">
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
      className="bg-[var(--g-cream)] px-3 pb-4 pt-3 sm:px-5 sm:pb-7 sm:pt-5 lg:px-8"
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
      <div className="gadget-hero-shell group relative mx-auto max-w-[80rem] overflow-hidden rounded-[1.15rem] border border-[var(--g-line)] bg-[var(--g-forest)] sm:rounded-[1.75rem]">
        <div className="relative h-[min(68svh,600px)] min-h-[460px] w-full sm:h-[520px] sm:min-h-0 lg:h-[570px]">
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
                    ? "none"
                    : `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  zIndex: isActive ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                }}
                aria-hidden={!isActive}
              >
                {shouldPaint ? (
                  <ResponsiveHeroImage banner={banner} eager={i === 0} />
                ) : null}
              </div>
            );
          })}

          {/* A fixed overlay keeps the copy readable without changing contrast on slide transitions. */}
          {(active.title || active.subtitle || active.ctaLabel) ? (
            <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(0deg,rgba(8,27,19,.96)_0%,rgba(8,27,19,.46)_47%,rgba(8,27,19,.08)_100%)] sm:bg-[linear-gradient(90deg,rgba(8,27,19,.94)_0%,rgba(8,27,19,.72)_35%,rgba(8,27,19,.08)_76%)]" />
          ) : null}

          {/* Controls remain visible for touch, keyboard and pointer users. */}
          {banners.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="absolute left-3 top-[30%] z-[10] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-7 sm:left-auto sm:right-20 sm:top-auto sm:translate-y-0"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="absolute right-3 top-[30%] z-[10] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-7 sm:right-7 sm:top-auto sm:translate-y-0"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex flex-col items-start gap-4 px-6 pb-8 pt-20 sm:bottom-auto sm:top-1/2 sm:max-w-[58%] sm:-translate-y-1/2 sm:px-12 sm:py-0 lg:px-20">
            <div className="pointer-events-auto flex max-w-[min(100%,35rem)] flex-col items-start gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e2c696] sm:text-[11px] sm:tracking-[0.24em]">{active.eyebrow || "The Buy N Try edit"}</span>
              {active.title ? (
                <h1 className="gadget-display text-left text-[clamp(2.6rem,7vw,5rem)] font-medium leading-[1.04] tracking-[-0.04em] text-white">
                  {active.title}
                </h1>
              ) : null}
              {active.subtitle ? (
                <p className="max-w-[36ch] text-left text-sm leading-relaxed text-white/90 sm:text-base">
                  {active.subtitle}
                </p>
              ) : null}

              <div className="flex items-center gap-1" aria-label="Choose featured collection">
                {banners.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    aria-current={i === index ? "true" : undefined}
                    className="relative flex h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span
                      className={`relative block h-1 rounded-full overflow-hidden transition-colors duration-300 ${
                        i === index
                          ? "w-10 bg-white/40"
                          : "w-3 bg-white/30 hover:bg-white/60"
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

            {!active.ctaDisabled ? (
              active.ctaLabel && active.href ? (
                <Link
                  href={active.href}
                  className="gadget-hero-cta pointer-events-auto inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full border border-white/30 bg-[var(--g-forest-mid)] px-6 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors sm:text-sm"
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
