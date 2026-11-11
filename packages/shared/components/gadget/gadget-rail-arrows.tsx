"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function GadgetRailArrows({
  scrollerId,
  title,
}: {
  scrollerId: string;
  title: string;
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
    const card = el.querySelector<HTMLElement>("[data-rail-card]");
    const step = card ? card.offsetWidth + 16 : 280;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Previous ${title}`}
        disabled={!canPrev}
        onClick={() => scrollByDir(-1)}
        className="gadget-icon-btn hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/80 text-[var(--g-charcoal)] disabled:opacity-30 sm:inline-flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`Next ${title}`}
        disabled={!canNext}
        onClick={() => scrollByDir(1)}
        className="gadget-icon-btn hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/80 text-[var(--g-charcoal)] disabled:opacity-30 sm:inline-flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </>
  );
}
