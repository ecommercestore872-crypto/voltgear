"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

import type { Testimonial } from "@/lib/types";

const FALLBACK: Testimonial[] = [
  {
    customerName: "Ayesha K.",
    reviewText:
      "Ordered a power bank on Friday and it arrived Monday with COD. Packaging was solid and the product feels premium — exactly as shown.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Hassan R.",
    reviewText:
      "My earbuds battery still lasts a full workday. Support answered WhatsApp in minutes when I asked about the warranty.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Sara M.",
    reviewText:
      "Finally a store that doesn’t oversell. The charger is fast, cables are thick, and returns were straightforward when I needed a size swap.",
    rating: 4,
    verified: true,
  },
  {
    customerName: "Bilal A.",
    reviewText:
      "Smartwatch setup was easy and tracking looks accurate. Paid cash on delivery with no surprises at the door.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Nida F.",
    reviewText:
      "Second order already. Curated picks make shopping faster — I don’t have to dig through junk listings.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Omar S.",
    reviewText:
      "Neckband sound is clear on calls. Delivery guy called before arriving — smooth COD experience from start to finish.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Fatima Z.",
    reviewText:
      "Bought a GaN charger for my laptop and phone. It runs cool and charges both at once. Will recommend to family.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Usman T.",
    reviewText:
      "Tracking link worked, product matched the photos, and the warranty card was in the box. Rare to get all three right.",
    rating: 4,
    verified: true,
  },
  {
    customerName: "Hira L.",
    reviewText:
      "Kids’ watch arrived with a simple setup guide. Battery lasts through school days. Support helped activate location sharing.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Danish Q.",
    reviewText:
      "Cable quality is better than the cheap ones from the market. No fraying after a month of daily use.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Maryam J.",
    reviewText:
      "I was skeptical about online COD but everything checked out. Headphones are comfortable for long Zoom calls.",
    rating: 5,
    verified: true,
  },
  {
    customerName: "Zain P.",
    reviewText:
      "Speaker is louder than expected for the size. Perfect for the desk. Checkout was quick and confirmation SMS was instant.",
    rating: 4,
    verified: true,
  },
];

const SPEED_PX_PER_SEC = 42;
const GAP_PX = 20;

function buildItems(reviews: Testimonial[]): Testimonial[] {
  const base = reviews.length ? [...reviews] : [];
  const names = new Set(base.map((r) => r.customerName.toLowerCase()));
  for (const f of FALLBACK) {
    if (base.length >= 12) break;
    if (names.has(f.customerName.toLowerCase())) continue;
    base.push(f);
    names.add(f.customerName.toLowerCase());
  }
  if (!base.length) return FALLBACK;
  return base;
}

export function GadgetReviewsSlider({ reviews }: { reviews: Testimonial[] }) {
  const items = useMemo(() => buildItems(reviews), [reviews]);
  const loop = useMemo(() => [...items, ...items], [items]);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(0);
  const resumeTimer = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const syncActive = useCallback(() => {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-review-card]");
    if (!el || !card) return;
    const step = card.offsetWidth + GAP_PX;
    const i = Math.round(el.scrollLeft / step) % items.length;
    setActive(i);
  }, [items.length]);

  /** Continuous auto-scroll (seamless loop via duplicated cards). */
  useEffect(() => {
    if (paused || reduceMotion) return;
    const el = scrollerRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      el.scrollLeft += SPEED_PX_PER_SEC * dt;
      const half = el.scrollWidth / 2;
      if (half > 0 && el.scrollLeft >= half) {
        el.scrollLeft -= half;
      }
      syncActive();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduceMotion, items.length, syncActive]);

  function pauseBriefly() {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 4500);
  }

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-review-card]");
    if (!el || !card) return;
    pauseBriefly();
    const step = card.offsetWidth + GAP_PX;
    el.scrollBy({ left: dir * step, behavior: reduceMotion ? "auto" : "smooth" });
    window.setTimeout(syncActive, 350);
  }

  function goTo(i: number) {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-review-card]");
    if (!el || !card) return;
    pauseBriefly();
    const step = card.offsetWidth + GAP_PX;
    el.scrollTo({ left: i * step, behavior: reduceMotion ? "auto" : "smooth" });
    setActive(i);
  }

  useEffect(() => {
    return () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  return (
    <section
      className="gadget-band-leaf relative overflow-hidden px-4 py-12 sm:py-16 lg:px-8"
      aria-labelledby="customer-reviews-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div
        className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-[var(--g-sage)]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[var(--g-terracotta)]/16 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
              Reviews
            </p>
            <h2
              id="customer-reviews-heading"
              className="gadget-display mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--g-charcoal)] sm:text-4xl"
            >
              What our customers say
            </h2>
            <p className="mt-2 text-sm text-[var(--g-taupe)] sm:text-[15px]">
              Real feedback from buyers who shopped with cash on delivery and curated picks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous review"
              onClick={() => scrollByDir(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] shadow-sm transition hover:border-[var(--g-forest)] hover:text-[var(--g-forest)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next review"
              onClick={() => scrollByDir(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] shadow-sm transition hover:border-[var(--g-forest)] hover:text-[var(--g-forest)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ul
          ref={scrollerRef}
          className="mt-8 flex gap-5 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={syncActive}
        >
          {loop.map((item, i) => (
            <li
              key={`${item.customerName}-${i}`}
              data-review-card
              className="w-[min(100%,18rem)] shrink-0 sm:w-[19rem]"
              aria-hidden={i >= items.length}
            >
              <blockquote className="gadget-review-card group flex h-full min-h-[14rem] flex-col rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-5 shadow-[0_4px_16px_rgba(31,54,38,0.04)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[var(--g-sage)]/40 hover:shadow-[0_12px_32px_rgba(31,54,38,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <Quote
                    className="h-6 w-6 text-[var(--g-sage)] transition duration-500 group-hover:scale-110 group-hover:text-[var(--g-forest)]"
                    aria-hidden
                  />
                  <div className="flex items-center gap-0.5" aria-label={`${item.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s < Math.round(item.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-amber-400/30"
                        }`}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-[var(--g-charcoal)]/85">
                  “{item.reviewText}”
                </p>

                <footer className="mt-4 flex items-center gap-3 border-t border-[var(--g-line)] pt-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--g-forest)] text-sm font-bold text-[var(--g-white)] transition duration-300 group-hover:scale-105"
                    aria-hidden
                  >
                    {item.customerName.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--g-charcoal)]">
                      {item.customerName.replace(/·\d+$/, "")}
                    </span>
                    {item.verified ? (
                      <span className="text-[11px] font-medium text-[var(--g-sage)]">
                        Verified buyer
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--g-taupe)]">
                        {item.product || "Customer"}
                      </span>
                    )}
                  </span>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Review slides">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to review ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                i === active
                  ? "w-7 bg-[var(--g-forest)]"
                  : "w-2 bg-[var(--g-taupe)]/35 hover:bg-[var(--g-taupe)]/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
