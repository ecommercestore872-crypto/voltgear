"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Sparkles,
  SlidersHorizontal,
  Package,
  Wifi,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RichText } from "@/components/product/rich-text";
import type { Product } from "@/lib/types";

/* ─── Tab Definitions ─────────────────────────────────────────────── */
type TabId = "details" | "features" | "specs" | "inbox" | "compatibility";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "details", label: "Full Details", icon: FileText },
  { id: "features", label: "Features", icon: Sparkles },
  { id: "specs", label: "Specifications", icon: SlidersHorizontal },
  { id: "inbox", label: "In the Box", icon: Package },
  { id: "compatibility", label: "Compatibility", icon: Wifi },
];

/* ─── Main Component ──────────────────────────────────────────────── */
export function GadgetProductTabs({ product }: { product: Product }) {
  const [active, setActive] = useState<TabId>("details");
  const tabsRef = useRef<HTMLDivElement>(null);

  const features = (product.features ?? []).filter(Boolean);
  const specs = (product.specifications ?? []).filter(
    (s) => s?.label?.trim() && s?.value?.trim()
  );
  const inbox = (product.inTheBox ?? []).filter(Boolean);
  const compat = (product.compatibility ?? []).filter((c) => c?.trim());
  const hasDesc = Boolean(product.description?.length);

  // Only show tabs that have data
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "details") return hasDesc;
    if (t.id === "features") return features.length > 0;
    if (t.id === "specs") return specs.length > 0;
    if (t.id === "inbox") return inbox.length > 0;
    if (t.id === "compatibility") return compat.length > 0;
    return false;
  });

  if (visibleTabs.length === 0) return null;

  // If active tab has no data, fall back to first visible tab
  const activeTab = visibleTabs.find((t) => t.id === active) ?? visibleTabs[0];

  return (
    <section
      className="mt-12 scroll-mt-20"
      aria-label="Product details"
    >
      {/* ── Tab Strip ─────────────────────────────────────────────── */}
      <div
        ref={tabsRef}
        className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-[var(--g-cream)] border-b border-[var(--g-line)]"
      >
        <div
          className="flex gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Product detail sections"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.id === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-[13px] font-semibold transition-all duration-200 sm:px-5 sm:py-4 sm:text-sm",
                  isActive
                    ? "text-[var(--g-forest)]"
                    : "text-[var(--g-taupe)] hover:text-[var(--g-charcoal)]"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors duration-200",
                    isActive
                      ? "text-[var(--g-forest)]"
                      : "text-[var(--g-taupe)]"
                  )}
                  aria-hidden
                />
                {tab.label}
                {/* Active underline indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full bg-[var(--g-forest)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <div className="mt-0 rounded-b-2xl border border-t-0 border-[var(--g-line)] bg-[var(--g-white)]">
        {/* Full Details */}
        {activeTab.id === "details" && hasDesc && (
          <div className="p-6 sm:p-8">
            <header className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--g-forest)]/10">
                <FileText className="h-4.5 w-4.5 text-[var(--g-forest)]" aria-hidden />
              </div>
              <div>
                <h2 className="gadget-display text-xl font-semibold tracking-tight text-[var(--g-charcoal)]">
                  Full Details
                </h2>
                <p className="text-xs text-[var(--g-taupe)]">Everything you need to know</p>
              </div>
            </header>
            <div className="prose prose-sm max-w-none text-[var(--g-charcoal)]/85 leading-relaxed">
              <RichText blocks={product.description!} />
            </div>
          </div>
        )}

        {/* Features */}
        {activeTab.id === "features" && features.length > 0 && (
          <div className="p-6 sm:p-8">
            <header className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" aria-hidden />
              </div>
              <div>
                <h2 className="gadget-display text-xl font-semibold tracking-tight text-[var(--g-charcoal)]">
                  Why You'll Love It
                </h2>
                <p className="text-xs text-[var(--g-taupe)]">Key highlights of this product</p>
              </div>
            </header>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-[var(--g-line)] bg-[var(--g-cream)] px-4 py-3 text-sm text-[var(--g-charcoal)] transition hover:border-[var(--g-sage)]/40 hover:bg-[var(--g-cream-deep)]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-white">
                    <Check className="h-3 w-3 stroke-[2.5]" aria-hidden />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specifications */}
        {activeTab.id === "specs" && specs.length > 0 && (
          <div className="p-6 sm:p-8">
            <header className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--g-forest)]/10">
                <SlidersHorizontal className="h-4.5 w-4.5 text-[var(--g-forest)]" aria-hidden />
              </div>
              <div>
                <h2 className="gadget-display text-xl font-semibold tracking-tight text-[var(--g-charcoal)]">
                  Specifications
                </h2>
                <p className="text-xs text-[var(--g-taupe)]">Technical details at a glance</p>
              </div>
            </header>
            <dl className="overflow-hidden rounded-xl border border-[var(--g-line)]">
              {specs.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "grid grid-cols-2 gap-4 px-5 py-3 text-sm",
                    i % 2 === 0 ? "bg-[var(--g-cream)]/60" : "bg-[var(--g-white)]"
                  )}
                >
                  <dt className="font-semibold text-[var(--g-charcoal)]">{s.label}</dt>
                  <dd className="text-[var(--g-taupe)]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* In the Box */}
        {activeTab.id === "inbox" && inbox.length > 0 && (
          <div className="p-6 sm:p-8">
            <header className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Package className="h-4.5 w-4.5 text-emerald-600" aria-hidden />
              </div>
              <div>
                <h2 className="gadget-display text-xl font-semibold tracking-tight text-[var(--g-charcoal)]">
                  What's in the Box
                </h2>
                <p className="text-xs text-[var(--g-taupe)]">Everything included in your purchase</p>
              </div>
            </header>
            <ul className="grid gap-2 sm:grid-cols-2">
              {inbox.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[var(--g-line)] bg-[var(--g-cream)] px-4 py-3 text-sm text-[var(--g-charcoal)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compatibility */}
        {activeTab.id === "compatibility" && compat.length > 0 && (
          <div className="p-6 sm:p-8">
            <header className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Wifi className="h-4.5 w-4.5 text-blue-500" aria-hidden />
              </div>
              <div>
                <h2 className="gadget-display text-xl font-semibold tracking-tight text-[var(--g-charcoal)]">
                  Compatibility
                </h2>
                <p className="text-xs text-[var(--g-taupe)]">Works great with these devices</p>
              </div>
            </header>
            <ul className="grid gap-2 sm:grid-cols-2">
              {compat.map((c, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[var(--g-line)] bg-[var(--g-cream)] px-4 py-3 text-sm text-[var(--g-charcoal)]"
                >
                  <Wifi className="h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
