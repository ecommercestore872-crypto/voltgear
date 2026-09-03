"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichText } from "@/components/product/rich-text";
import type { Product } from "@/lib/types";

/* ─── Section Definitions ─────────────────────────────────────────── */
type TabId = "details" | "features" | "specs" | "inbox" | "compatibility";

const SECTIONS: {
  id: TabId;
  label: string;
  accent: string;           // border-left accent & open-chevron bg
  headerGlass: string;      // header background
  bodyGlass: string;        // body background
  tagBg: string;            // pill/number badge
}[] = [
  {
    id: "details",
    label: "Full Details",
    accent: "border-l-violet-400",
    headerGlass: "bg-white/70 backdrop-blur-sm",
    bodyGlass: "bg-violet-50/40 backdrop-blur-sm",
    tagBg: "bg-violet-100 text-violet-700",
  },
  {
    id: "features",
    label: "Why You'll Love It",
    accent: "border-l-rose-400",
    headerGlass: "bg-white/70 backdrop-blur-sm",
    bodyGlass: "bg-rose-50/40 backdrop-blur-sm",
    tagBg: "bg-rose-100 text-rose-700",
  },
  {
    id: "specs",
    label: "Specifications",
    accent: "border-l-slate-400",
    headerGlass: "bg-white/70 backdrop-blur-sm",
    bodyGlass: "bg-slate-50/60 backdrop-blur-sm",
    tagBg: "bg-slate-100 text-slate-600",
  },
  {
    id: "inbox",
    label: "What's in the Box",
    accent: "border-l-teal-400",
    headerGlass: "bg-white/70 backdrop-blur-sm",
    bodyGlass: "bg-teal-50/40 backdrop-blur-sm",
    tagBg: "bg-teal-100 text-teal-700",
  },
  {
    id: "compatibility",
    label: "Compatibility",
    accent: "border-l-indigo-400",
    headerGlass: "bg-white/70 backdrop-blur-sm",
    bodyGlass: "bg-indigo-50/40 backdrop-blur-sm",
    tagBg: "bg-indigo-100 text-indigo-700",
  },
];

/* ─── Main Component ──────────────────────────────────────────────── */
export function GadgetProductTabs({ product }: { product: Product }) {
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
    <section className="mt-8 sm:mt-10 max-w-4xl mx-auto space-y-2.5" aria-label="Product details">
      {visibleSections.map((section) => {
        const isOpen = openId === section.id;
        return (
          <div
            key={section.id}
            className={cn(
              "group overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-px border-l-[3px]",
              section.accent
            )}
          >
            {/* ── Glass Header ── */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? "" : section.id)}
              className={cn(
                "flex w-full items-center justify-between px-5 py-4 text-left transition-all duration-200 sm:px-6 sm:py-4",
                section.headerGlass
              )}
              aria-expanded={isOpen}
            >
              <span className="text-[15px] font-semibold tracking-tight text-slate-800 sm:text-base">
                {section.label}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  isOpen
                    ? "bg-slate-800 text-white rotate-180"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                )}
                aria-hidden
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </button>

            {/* ── Accordion Body ── */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className={cn("border-t border-white/40 p-5 sm:p-6", section.bodyGlass)}>

                  {/* Full Details */}
                  {section.id === "details" && hasDesc && (
                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed sm:prose-base">
                      <RichText blocks={product.description!} />
                    </div>
                  )}

                  {/* Features */}
                  {section.id === "features" && features.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm text-slate-700 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
                        >
                          <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", section.tagBg)}>
                            {i + 1}
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Specifications */}
                  {section.id === "specs" && specs.length > 0 && (
                    <dl className="overflow-hidden rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                      {specs.map((s, i) => (
                        <div
                          key={s.label}
                          className={cn(
                            "grid grid-cols-[110px_1fr] sm:grid-cols-[160px_1fr] gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/60",
                            i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"
                          )}
                        >
                          <dt className="font-semibold text-slate-700 truncate pr-2">{s.label}</dt>
                          <dd className="text-slate-500">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* In the Box */}
                  {section.id === "inbox" && inbox.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {inbox.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm text-slate-700 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
                        >
                          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", section.tagBg)}>
                            {i + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Compatibility */}
                  {section.id === "compatibility" && compat.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {compat.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm text-slate-700 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
                        >
                          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", section.tagBg)}>
                            {i + 1}
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
