"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type Chapter = {
  id: string;
  label: string;
  /** Server-rendered icon. */
  icon: ReactNode;
  /** Server-rendered panel body: always present in the HTML, shown when the tab is open. */
  body: ReactNode;
};

/** Only the tab toggle runs in the browser; all chapter text is rendered on the server. */
export function GadgetChapterTabs({
  chapters,
  hasDesc,
}: {
  chapters: Chapter[];
  hasDesc: boolean;
}) {
  const baseId = useId();
  const [openId, setOpenId] = useState("");
  const activeIndex = chapters.findIndex((s) => s.id === openId);
  const active = activeIndex >= 0 ? chapters[activeIndex] : null;

  function onTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const last = chapters.length - 1;
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else {
      return;
    }
    event.preventDefault();
    document.getElementById(`${baseId}-tab-${chapters[next].id}`)?.focus();
  }

  return (
    <div
      className={cn(
        "mt-4 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[var(--g-cream)]",
        active &&
          "md:grid md:grid-cols-[minmax(14rem,16.5rem)_minmax(0,1fr)]",
        hasDesc && "mt-5",
      )}
    >
      <div
        role="tablist"
        aria-label="Chapters"
        aria-orientation="vertical"
        className={cn(
          "flex flex-col bg-[color-mix(in_srgb,var(--g-sage)_10%,var(--g-cream-deep))]",
          active &&
            "border-b border-[var(--g-line)] md:border-b-0 md:border-r md:border-r-[color-mix(in_srgb,var(--g-sage)_22%,var(--g-line))]",
        )}
      >
        {chapters.map((section, index) => {
          const isOpen = section.id === active?.id;
          const chapter = String(index + 1).padStart(2, "0");
          const tabId = `${baseId}-tab-${section.id}`;

          return (
            <button
              key={section.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isOpen}
              aria-expanded={isOpen}
              aria-controls={`${baseId}-panel-${section.id}`}
              onClick={() => setOpenId((current) => (current === section.id ? "" : section.id))}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "group relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 sm:px-5",
                "focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--g-forest)]",
                isOpen
                  ? "bg-[color-mix(in_srgb,var(--g-forest)_12%,var(--g-sand))] text-[var(--g-forest)]"
                  : "text-[var(--g-charcoal)] hover:bg-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-cream))] hover:text-[var(--g-forest)]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-2 left-0 w-0.5 rounded-full transition-colors duration-200",
                  isOpen
                    ? "bg-[var(--g-forest)]"
                    : "bg-transparent group-hover:bg-[var(--g-sage)]",
                )}
              />
              <span
                className={cn(
                  "gadget-display w-7 shrink-0 text-[14px] tabular-nums transition-colors duration-200",
                  isOpen
                    ? "text-[var(--g-forest)]"
                    : "text-[var(--g-taupe)] group-hover:text-[var(--g-forest)]",
                )}
              >
                {chapter}
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
                  isOpen
                    ? "border-[var(--g-forest)] bg-[var(--g-forest)] text-[var(--g-cream)]"
                    : "border-[color-mix(in_srgb,var(--g-sage)_35%,var(--g-line))] bg-[var(--g-cream)] text-[var(--g-forest)] group-hover:border-[var(--g-forest)] group-hover:bg-[var(--g-forest)] group-hover:text-[var(--g-cream)]",
                )}
                aria-hidden
              >
                {section.icon}
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight transition-colors duration-200 sm:text-[15px]">
                {section.label}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 stroke-[1.75] transition-all duration-200",
                  isOpen
                    ? "rotate-180 text-[var(--g-forest)]"
                    : "text-[var(--g-taupe)] group-hover:text-[var(--g-forest)]",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {chapters.map((chapter, index) => {
        const num = String(index + 1).padStart(2, "0");
        return (
          <div
            key={chapter.id}
            role="tabpanel"
            id={`${baseId}-panel-${chapter.id}`}
            aria-labelledby={`${baseId}-tab-${chapter.id}`}
            hidden={chapter.id !== active?.id}
            className="relative bg-[color-mix(in_srgb,var(--g-sage)_8%,var(--g-sand))] px-5 py-6 sm:px-8 sm:py-8"
          >
            <span
              aria-hidden
              className="gadget-display pointer-events-none absolute right-5 top-4 select-none text-xl leading-none text-[var(--g-forest)]/15 sm:right-7 sm:top-5 sm:text-2xl"
            >
              {num}
            </span>
            <p className="gadget-eyebrow relative">
              {num} · {chapter.label}
            </p>
            <div className="relative mt-5">{chapter.body}</div>
          </div>
        );
      })}
    </div>
  );
}
