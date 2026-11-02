"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { PHOSPHOR_SEARCH } from "@/components/icons/phosphor-chrome";

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
        "group relative flex items-center rounded-[10px] border bg-white transition duration-200 ease-out",
        tall ? "h-12 sm:h-[3.15rem]" : "h-10 sm:h-11",
        focused
          ? "border-[var(--g-forest)]"
          : "border-[var(--g-line)] hover:border-[var(--g-forest)]/40",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-3 flex items-center justify-center rounded-[8px] text-[var(--g-forest)]",
          tall ? "left-3.5 h-8 w-8 sm:left-4" : "h-7 w-7",
        )}
        aria-hidden
      >
        <MagnifyingGlass {...PHOSPHOR_SEARCH} aria-hidden />
      </span>
      <input
        id={id}
        name={name}
        type="search"
        list="fast-search-list"
        aria-label="Search store products"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "h-full w-full min-w-0 bg-transparent text-base text-[var(--g-charcoal)] outline-none placeholder:text-[var(--g-charcoal)]/60 sm:text-sm",
          tall ? "pl-[3.35rem] sm:pl-14" : "pl-11",
          showSubmit ? "pr-20 sm:pr-24" : "pr-4",
        )}
      />

      {focused && (
        <datalist id="fast-search-list">
          {[
            "Earbuds",
            "Smartwatch",
            "Power Bank",
            "Ring Light",
            "Tripod",
            "Selfie Stick",
            "Fast Charger",
            "Wireless Mic",
            "Stylus Pen",
            "Gaming Gear",
          ].map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      )}
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
