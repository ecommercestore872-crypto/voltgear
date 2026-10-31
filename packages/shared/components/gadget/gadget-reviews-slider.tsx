"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import type { Testimonial } from "@/lib/types";

const GAP_PX = 20;

function realReviewsOnly(reviews: Testimonial[]): Testimonial[] {
  return reviews.filter(
    (r) =>
      Boolean(r.customerName?.trim()) &&
      Boolean(r.reviewText?.trim()) &&
      typeof r.rating === "number" &&
      r.rating > 0,
  );
}

export function GadgetReviewsSlider({ reviews }: { reviews: Testimonial[] }) {
  const items = useMemo(() => realReviewsOnly(reviews), [reviews]);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(0);

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
    const i = Math.round(el.scrollLeft / step);
    setActive(Math.min(items.length - 1, Math.max(0, i)));
  }, [items.length]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-review-card]");
    if (!el || !card) return;
    const step = card.offsetWidth + GAP_PX;
    el.scrollBy({
      left: dir * step,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    window.setTimeout(syncActive, 350);
  }

  function goTo(i: number) {
    const el = scrollerRef.current;
    const card = el?.querySelector<HTMLElement>("[data-review-card]");
    if (!el || !card) return;
    const step = card.offsetWidth + GAP_PX;
    el.scrollTo({ left: i * step, behavior: reduceMotion ? "auto" : "smooth" });
    setActive(i);
  }

  if (!items.length) return null;

  return (
    <section
      className="gadget-band-leaf relative overflow-hidden px-4 py-12 sm:py-16 lg:px-8"
      aria-labelledby="customer-reviews-heading"
    >
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-forest)]">
              Customer reviews
            </p>
            <h2
              id="customer-reviews-heading"
              className="gadget-display mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--g-charcoal)] sm:text-4xl"
            >
              From buyers who ordered here
            </h2>
            <p className="mt-2 text-sm text-[var(--g-charcoal)]/80 sm:text-[15px]">
              Only published customer feedback from Buy n Try orders.
            </p>
          </div>
          {items.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous review"
                onClick={() => scrollByDir(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] transition hover:border-[var(--g-forest)] hover:text-[var(--g-forest)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next review"
                onClick={() => scrollByDir(1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] transition hover:border-[var(--g-forest)] hover:text-[var(--g-forest)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <ul
          ref={scrollerRef}
          className="mt-8 flex gap-5 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={syncActive}
        >
          {items.map((item, i) => (
            <li
              key={`${item.customerName}-${i}`}
              data-review-card
              className="w-[min(85vw,18.5rem)] shrink-0 sm:w-[19rem]"
            >
              <blockquote className="flex h-full min-h-[12rem] flex-col border border-[var(--g-line)] bg-[var(--g-white)] p-5 rounded-[10px]">
                <div
                  className="flex items-center gap-0.5"
                  role="img"
                  aria-label={`${item.rating} out of 5 stars`}
                >
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

                <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-[var(--g-charcoal)]/85">
                  “{item.reviewText}”
                </p>

                <footer className="mt-4 border-t border-[var(--g-line)] pt-3">
                  <span className="block text-sm font-semibold text-[var(--g-charcoal)]">
                    {item.customerName.replace(/·\d+$/, "")}
                  </span>
                  {item.verified ? (
                    <span className="text-[11px] font-medium text-[var(--g-forest)]">
                      Verified buyer
                    </span>
                  ) : item.product ? (
                    <span className="text-[11px] text-[var(--g-charcoal)]/75">
                      {item.product}
                    </span>
                  ) : null}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>

        {items.length > 1 ? (
          <div
            className="mt-6 flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Review slides"
          >
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === active ? "true" : undefined}
                aria-label={`Go to review ${i + 1}`}
                onClick={() => goTo(i)}
                className="flex h-8 min-w-8 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`block h-2 rounded-full transition-all duration-300 ease-out ${
                    i === active
                      ? "w-7 bg-[var(--g-forest)]"
                      : "w-2 bg-[var(--g-taupe)]/35"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
