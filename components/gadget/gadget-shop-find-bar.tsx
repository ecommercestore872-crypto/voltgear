"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow, Search, Sparkles, X } from "lucide-react";

import { products2Href } from "@/lib/gadget-preview";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "featured", label: "Featured", hint: "Picks first" },
  { id: "price-asc", label: "Price: Low", hint: "Ascending" },
  { id: "price-desc", label: "Price: High", hint: "Descending" },
] as const;

export function GadgetShopFindBar({
  basePath,
  query,
  sort,
  resultCount,
  categorySlug,
}: {
  basePath: string;
  query: string;
  sort: string;
  resultCount: number;
  categorySlug?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(query);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setQ(query);
  }, [query]);

  function go(next: { q?: string; sort?: string }) {
    const params = new URLSearchParams();
    const nextQ = next.q !== undefined ? next.q : q;
    const nextSort = next.sort !== undefined ? next.sort : sort;
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextSort && nextSort !== "featured") params.set("sort", nextSort);
    const qs = params.toString();
    const path = categorySlug ? products2Href(categorySlug) : basePath;
    startTransition(() => {
      router.push(qs ? `${path}?${qs}` : path);
    });
  }

  function clearSearch() {
    setQ("");
    go({ q: "" });
  }

  return (
    <div
      className="sticky z-30"
      style={{ top: "calc(var(--g-header-offset, 3.5rem) + var(--g-safe-top, 0px))" }}
    >
      <div className="gadget-glass rounded-2xl px-3 py-3 sm:rounded-[1.35rem] sm:px-4 sm:py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          {/* Search */}
          <form
            className="min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              go({ q });
            }}
          >
            <label htmlFor="gadget-shop-q" className="sr-only">
              Search products
            </label>
            <div
              className={cn(
                "group relative flex h-12 items-center rounded-full border bg-[var(--g-white)]/90 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[3.15rem]",
                focused
                  ? "border-[var(--g-forest)]/35 shadow-[0_0_0_4px_rgba(31,54,38,0.08),0_10px_28px_rgba(31,54,38,0.08)]"
                  : "border-[var(--g-line)] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] hover:border-[var(--g-forest)]/20"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none absolute left-3.5 flex h-8 w-8 items-center justify-center rounded-full transition duration-300 sm:left-4",
                  focused
                    ? "bg-[var(--g-forest)] text-[var(--g-white)]"
                    : "bg-[var(--g-cream-deep)] text-[var(--g-forest)]"
                )}
                aria-hidden
              >
                <Search className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <input
                id="gadget-shop-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search chargers, earbuds, watches…"
                className="h-full w-full bg-transparent pl-[3.35rem] pr-20 text-base text-[var(--g-charcoal)] outline-none placeholder:text-[var(--g-taupe)]/85 sm:pl-14 sm:pr-24"
              />
              <div className="absolute right-1.5 flex items-center gap-1 sm:right-2">
                {q ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--g-taupe)] transition hover:bg-[var(--g-cream-deep)] hover:text-[var(--g-charcoal)]"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="gadget-press hidden h-9 items-center rounded-full bg-[var(--g-forest)] px-3.5 text-[12px] font-semibold text-[var(--g-white)] shadow-[0_6px_16px_rgba(31,54,38,0.2)] transition hover:bg-[var(--g-forest-mid)] sm:inline-flex"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Sort + count */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-4">
            <p
              className={cn(
                "flex items-center gap-1.5 text-[12px] text-[var(--g-taupe)] sm:text-[13px]",
                pending && "opacity-55"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--g-sage)]" aria-hidden />
              <span>
                <span className="font-semibold tabular-nums text-[var(--g-charcoal)]">
                  {resultCount}
                </span>{" "}
                {resultCount === 1 ? "piece" : "pieces"}
                {query ? (
                  <>
                    {" "}
                    for <span className="font-medium text-[var(--g-charcoal)]">“{query}”</span>
                  </>
                ) : null}
              </span>
            </p>

            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="Sort products"
            >
              <span className="mr-0.5 hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g-sage)] sm:inline-flex">
                <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden />
                Sort
              </span>
              {SORTS.map((s) => {
                const active = sort === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    title={s.hint}
                    aria-pressed={active}
                    onClick={() => go({ sort: s.id })}
                    className={cn(
                      "gadget-chip inline-flex h-10 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold sm:h-11 sm:px-4",
                      active ? "gadget-chip-active" : "gadget-chip-idle"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
