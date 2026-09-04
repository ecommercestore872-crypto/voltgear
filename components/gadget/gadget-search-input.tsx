"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function GadgetSearchInput({
  id,
  name = "q",
  placeholder = "Search chargers, earbuds, watches…",
  className,
  size = "md",
  showSubmit = false,
}: {
  id: string;
  name?: string;
  placeholder?: string;
  className?: string;
  size?: "md" | "lg";
  showSubmit?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const tall = size === "lg";

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-full border bg-white transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        tall ? "h-12 sm:h-[3.15rem]" : "h-10 sm:h-11",
        focused
          ? "border-[var(--g-forest)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--g-sage)_28%,transparent)]"
          : "border-[var(--g-line)] shadow-none hover:border-[color-mix(in_srgb,var(--g-sage)_40%,var(--g-line))]",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-3 flex items-center justify-center rounded-full transition duration-300",
          tall ? "left-3.5 h-8 w-8 sm:left-4" : "h-7 w-7",
          focused
            ? "bg-[var(--g-forest)] text-white"
            : "bg-[var(--g-cream)] text-[var(--g-forest)]"
        )}
        aria-hidden
      >
        <Search className={tall ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} strokeWidth={2.2} />
      </span>
      <input
        id={id}
        name={name}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "h-full w-full bg-transparent text-sm text-[var(--g-charcoal)] outline-none placeholder:text-[var(--g-taupe)]",
          tall ? "pl-[3.35rem] sm:pl-14" : "pl-11",
          showSubmit ? "pr-20 sm:pr-24" : "pr-4"
        )}
      />
      {showSubmit ? (
        <button
          type="submit"
          className="gadget-press absolute right-1.5 hidden h-8.5 items-center rounded-full bg-[var(--g-forest)] px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-[var(--g-forest-mid)] sm:right-2 sm:inline-flex"
        >
          Search
        </button>
      ) : null}
    </div>
  );
}
