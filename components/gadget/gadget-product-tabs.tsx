"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Sparkles,
  SlidersHorizontal,
  Package,
  Wifi,
  Check,
  Smartphone,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RichText } from "@/components/product/rich-text";
import type { Product } from "@/lib/types";

/* ─── Tab Definitions ─────────────────────────────────────────────── */
type TabId = "details" | "features" | "specs" | "inbox" | "compatibility";

const SECTIONS: {
  id: TabId;
  label: string;
  icon: React.ElementType;
  colorBg: string;
  iconBg: string;
  iconColor: string;
}[] = [
  { id: "details", label: "Full Details", icon: FileText, colorBg: "bg-[var(--g-cream)]", iconBg: "bg-sky-50 shadow-sky-500/10 border-sky-100", iconColor: "text-sky-600" },
  { id: "features", label: "Why You'll Love It", icon: Sparkles, colorBg: "bg-amber-50/50", iconBg: "bg-amber-50 shadow-amber-500/10 border-amber-100", iconColor: "text-amber-500" },
  { id: "specs", label: "Specifications", icon: SlidersHorizontal, colorBg: "bg-stone-50", iconBg: "bg-zinc-50 shadow-zinc-500/10 border-zinc-200", iconColor: "text-zinc-600" },
  { id: "inbox", label: "What's in the Box", icon: Package, colorBg: "bg-emerald-50/40", iconBg: "bg-emerald-50 shadow-emerald-500/10 border-emerald-100", iconColor: "text-emerald-600" },
  { id: "compatibility", label: "Compatibility", icon: Wifi, colorBg: "bg-indigo-50/40", iconBg: "bg-indigo-50 shadow-indigo-500/10 border-indigo-100", iconColor: "text-indigo-600" },
];

/* ─── Main Component ──────────────────────────────────────────────── */
export function GadgetProductTabs({ product }: { product: Product }) {
  // Details is open by default
  const [openId, setOpenId] = useState<TabId | "">("details");

  const features = (product.features ?? []).filter(Boolean);
  const specs = (product.specifications ?? []).filter(
    (s) => s?.label?.trim() && s?.value?.trim()
  );
  const inbox = (product.inTheBox ?? []).filter(Boolean);
  const compat = (product.compatibility ?? []).filter((c) => c?.trim());
  const hasDesc = Boolean(product.description?.length);

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === "details") return hasDesc;
    if (s.id === "features") return features.length > 0;
    if (s.id === "specs") return specs.length > 0;
    if (s.id === "inbox") return inbox.length > 0;
    if (s.id === "compatibility") return compat.length > 0;
    return false;
  });

  if (visibleSections.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-10 max-w-4xl mx-auto space-y-3" aria-label="Product details">
      {visibleSections.map((section) => {
        const isOpen = openId === section.id;
        const Icon = section.icon;
        return (
          <div
            key={section.id}
            className="group overflow-hidden rounded-xl border border-[var(--g-line)] bg-[var(--g-white)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          >
            {/* ── Accordion Header Strip ── */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? "" : section.id)}
              className="flex w-full items-center justify-between bg-gradient-to-b from-[var(--g-white)] to-[var(--g-cream)]/30 px-4 py-3.5 transition-colors hover:from-[var(--g-white)] hover:to-[var(--g-cream)]/80 sm:px-5 sm:py-4"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-transform duration-300 group-hover:scale-105", section.iconBg)}>
                  <Icon className={cn("h-4.5 w-4.5", section.iconColor)} aria-hidden />
                </span>
                <span className="gadget-display text-base font-semibold tracking-tight text-[var(--g-charcoal)] sm:text-lg">
                  {section.label}
                </span>
              </div>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full bg-[var(--g-white)] border border-[var(--g-line)] text-[var(--g-forest)] shadow-sm transition-transform duration-300",
                  isOpen ? "rotate-180 bg-[var(--g-forest)] text-[var(--g-white)] border-transparent" : "group-hover:border-[var(--g-forest)]/30"
                )}
                aria-hidden
              >
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>

            {/* ── Accordion Content ── */}
            <div
              className={cn(
                "grid transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "border-t border-[var(--g-line)] p-4 sm:p-5",
                    section.colorBg
                  )}
                >
                  {/* Details */}
                  {section.id === "details" && hasDesc && (
                    <div className="prose prose-sm max-w-none text-[var(--g-charcoal)]/85 leading-relaxed sm:prose-base">
                      <RichText blocks={product.description!} />
                    </div>
                  )}

                  {/* Features */}
                  {section.id === "features" && features.length > 0 && (
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 rounded-lg border border-amber-200/40 bg-[var(--g-white)] px-3.5 py-3 text-sm font-medium text-[var(--g-charcoal)] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md"
                        >
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Specifications */}
                  {section.id === "specs" && specs.length > 0 && (
                    <dl className="overflow-hidden rounded-lg border border-[var(--g-line)] bg-[var(--g-white)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      {specs.map((s, i) => (
                        <div
                          key={s.label}
                          className={cn(
                            "grid grid-cols-[100px_1fr] sm:grid-cols-2 gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--g-cream)]/50",
                            i % 2 === 0 ? "bg-[var(--g-cream)]/20" : "bg-[var(--g-white)]"
                          )}
                        >
                          <dt className="font-semibold text-[var(--g-charcoal)] truncate pr-2">{s.label}</dt>
                          <dd className="text-[var(--g-taupe)]">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* In the Box */}
                  {section.id === "inbox" && inbox.length > 0 && (
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {inbox.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-emerald-200/40 bg-[var(--g-white)] px-3.5 py-3 text-sm font-medium text-[var(--g-charcoal)] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-600 shadow-sm">
                            {i + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Compatibility */}
                  {section.id === "compatibility" && compat.length > 0 && (
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {compat.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-indigo-200/40 bg-[var(--g-white)] px-3.5 py-3 text-sm font-medium text-[var(--g-charcoal)] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 border border-indigo-100 text-indigo-500 shadow-sm">
                            <Smartphone className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
