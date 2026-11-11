"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function GadgetCategoryArrows({
  scrollerId,
}: {
  scrollerId: string;
}) {
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia("(min-width: 640px)").matches) return;
    const el = document.getElementById(scrollerId);
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev((prev) => {
      const nextVal = el.scrollLeft > 6;
      return prev !== nextVal ? nextVal : prev;
    });
    setCanNext((prev) => {
      const nextVal = max > 6 && el.scrollLeft < max - 6;
      return prev !== nextVal ? nextVal : prev;
    });
  }, [scrollerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    if (!mq.matches) return;

    const el = document.getElementById(scrollerId);
    if (!el) return;

    let rafId: number | null = null;
    rafId = window.requestAnimationFrame(updateArrows);
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [scrollerId, updateArrows]);

  function scrollByDir(dir: -1 | 1) {
    const el = document.getElementById(scrollerId);
    if (!el) return;
    const step = el.clientWidth * 0.65;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <button
        type="button"
        onClick={() => scrollByDir(-1)}
        disabled={!canPrev}
        aria-label="Previous categories"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--g-line)] bg-white text-[var(--g-charcoal)] shadow-xs transition disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scrollByDir(1)}
        disabled={!canNext}
        aria-label="Next categories"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--g-line)] bg-white text-[var(--g-charcoal)] shadow-xs transition disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
