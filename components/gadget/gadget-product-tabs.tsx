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

const SECTIONS: {
  id: TabId;
  label: string;
  emoji: string;
  colorBg: string;
}[] = [
  { id: "details", label: "Full Details", emoji: "📝", colorBg: "bg-[var(--g-cream)]" },
  { id: "features", label: "Why You'll Love It", emoji: "✨", colorBg: "bg-amber-50/50" },
  { id: "specs", label: "Specifications", emoji: "⚙️", colorBg: "bg-stone-50" },
  { id: "inbox", label: "What's in the Box", emoji: "📦", colorBg: "bg-emerald-50/40" },
  { id: "compatibility", label: "Compatibility", emoji: "🔗", colorBg: "bg-blue-50/40" },
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
    <section className="mt-10 sm:mt-12 space-y-4" aria-label="Product details">
      {visibleSections.map((section) => {
        const isOpen = openId === section.id;
        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          >
            {/* ── Accordion Header Strip ── */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? "" : section.id)}
              className="flex w-full items-center justify-between bg-[var(--g-cream)]/40 px-5 py-4 transition-colors hover:bg-[var(--g-cream)] sm:px-6 sm:py-5"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--g-white)] text-xl shadow-sm border border-[var(--g-line)]">
                  {section.emoji}
                </span>
                <span className="gadget-display text-lg font-semibold tracking-tight text-[var(--g-charcoal)] sm:text-xl">
                  {section.label}
                </span>
              </div>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--g-white)] border border-[var(--g-line)] text-[var(--g-forest)] transition-transform duration-300",
                  isOpen ? "rotate-180" : ""
                )}
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {/* ── Accordion Content ── */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "border-t border-[var(--g-line)] p-5 sm:p-6",
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
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-xl border border-amber-200/40 bg-[var(--g-white)] px-4 py-3.5 text-[15px] font-medium text-[var(--g-charcoal)] shadow-sm"
                        >
                          <span className="mt-0.5 shrink-0 text-amber-500">
                            ★
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Specifications */}
                  {section.id === "specs" && specs.length > 0 && (
                    <dl className="overflow-hidden rounded-xl border border-[var(--g-line)] bg-[var(--g-white)] shadow-sm">
                      {specs.map((s, i) => (
                        <div
                          key={s.label}
                          className={cn(
                            "grid grid-cols-[120px_1fr] sm:grid-cols-2 gap-4 px-5 py-3.5 text-[15px]",
                            i % 2 === 0 ? "bg-[var(--g-cream)]/30" : "bg-[var(--g-white)]"
                          )}
                        >
                          <dt className="font-semibold text-[var(--g-charcoal)]">{s.label}</dt>
                          <dd className="text-[var(--g-taupe)]">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* In the Box */}
                  {section.id === "inbox" && inbox.length > 0 && (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {inbox.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3.5 rounded-xl border border-emerald-200/40 bg-[var(--g-white)] px-4 py-3.5 text-[15px] font-medium text-[var(--g-charcoal)] shadow-sm"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-xs font-bold text-emerald-700">
                            {i + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Compatibility */}
                  {section.id === "compatibility" && compat.length > 0 && (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {compat.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3.5 rounded-xl border border-blue-200/40 bg-[var(--g-white)] px-4 py-3.5 text-[15px] font-medium text-[var(--g-charcoal)] shadow-sm"
                        >
                          <span className="shrink-0 text-xl text-blue-500">📱</span>
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
