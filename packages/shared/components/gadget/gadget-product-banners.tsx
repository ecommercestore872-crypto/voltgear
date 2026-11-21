"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { cloudinaryLoader } from "@/lib/cloudinary";
import { GADGET_PRODUCT_BANNERS } from "@/lib/gadget-product-banners";

const INTERVAL_MS = 7000;
const FADE_MS = 600;

export function GadgetProductBanners() {
  const banners = GADGET_PRODUCT_BANNERS;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

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
    if (paused) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % banners.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [paused, banners.length]);

  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setIndex((i) => (i + 1) % banners.length);

  return (
    <section
      className="login-hero-pull relative px-2 pb-4 pt-2 sm:px-5 sm:pb-7 sm:pt-5 lg:px-5 lg:pt-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          prev();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        }
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        touchStartX.current = null;
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products"
    >
      <div className="gadget-hero-shell relative mx-auto max-w-[120rem] overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem]">
        <div className="relative h-[640px] w-full sm:h-[560px] lg:h-[min(84svh,720px)] lg:min-h-[600px]">
          {banners.map((b, i) => {
            const active = i === index;
            return (
              <div
                key={b.id}
                className="absolute inset-0 flex flex-col text-white"
                style={{
                  background: b.gradient,
                  opacity: active ? 1 : 0,
                  transition: reduceMotion
                    ? "none"
                    : `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  zIndex: active ? 1 : 0,
                  pointerEvents: active ? "auto" : "none",
                }}
                aria-hidden={!active}
              >
                {/* soft depth shapes */}
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-2xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-32 left-1/4 h-[24rem] w-[24rem] rounded-full bg-black/15 blur-3xl"
                  aria-hidden
                />

                <div className="relative z-[2] grid flex-1 grid-rows-[auto_1fr] items-center gap-4 px-6 pb-3 pt-[5.5rem] sm:px-10 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-1 lg:gap-8 lg:px-16 lg:pb-0 lg:pt-28">
                  <div className="min-w-0 text-center lg:text-left">
                    <p className="inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] sm:text-xs">
                      {b.eyebrow}
                    </p>
                    <h2 className="mt-3 text-[2.6rem] font-black uppercase italic leading-[0.95] tracking-[-0.03em] drop-shadow-[0_4px_18px_rgba(0,0,0,0.25)] sm:text-6xl lg:mt-5 lg:text-[5.5rem]">
                      {b.title}
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm font-semibold uppercase tracking-[0.08em] text-white/90 sm:text-base lg:mx-0 lg:mt-5">
                      {b.subtitle}
                    </p>
                    <Link
                      href={b.href}
                      tabIndex={active ? 0 : -1}
                      className="gadget-hero-cta mt-5 inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-sm font-extrabold uppercase tracking-[0.06em] transition lg:mt-8"
                    >
                      {b.ctaLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>

                  <div className="relative mx-auto flex min-h-0 w-full max-w-[17rem] items-center justify-center sm:max-w-[22rem] lg:max-w-[25rem]">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] bg-white/90 shadow-[0_30px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/50 lg:rotate-[3deg]">
                      <Image
                        loader={cloudinaryLoader}
                        unoptimized
                        src={b.image}
                        alt={b.imageAlt}
                        fill
                        priority={i === 0}
                        sizes="(max-width: 640px) 70vw, 480px"
                        className="object-contain p-3"
                      />
                    </div>
                  </div>
                </div>

                <ul className="relative z-[2] mx-4 mb-12 grid grid-cols-2 gap-2 sm:mx-10 sm:mb-14 sm:grid-cols-4 sm:gap-3 lg:mx-16 lg:mb-16">
                  {b.features.map((f) => (
                    <li
                      key={f}
                      className="flex min-h-11 items-center justify-center rounded-2xl bg-white/15 px-3 py-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-[0.06em] ring-1 ring-white/25 backdrop-blur-sm sm:min-h-14 sm:text-xs"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-[42%] z-[10] hidden h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--g-forest)] shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-[42%] z-[10] hidden h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--g-forest)] shadow-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="absolute inset-x-0 bottom-1 z-[6] flex items-center justify-center sm:bottom-3"
            aria-label="Choose featured product"
          >
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
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
        </div>
      </div>
    </section>
  );
}
