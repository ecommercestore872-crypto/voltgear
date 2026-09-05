"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  Check,
  ChevronDown,
  ListChecks,
  Package,
  Ruler,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { GadgetProductReadMore } from "@/components/gadget/gadget-product-read-more";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabId = "features" | "specs" | "inbox" | "compatibility";

const SECTIONS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "features", label: "Why you'll love it", Icon: ListChecks },
  { id: "specs", label: "Specifications", Icon: Ruler },
  { id: "inbox", label: "What's in the box", Icon: Package },
  { id: "compatibility", label: "Compatibility", Icon: Smartphone },
];

function visibleFor(product: Product) {
  const features = (product.features ?? []).filter(Boolean);
  const specs = (product.specifications ?? []).filter(
    (s) => s?.label?.trim() && s?.value?.trim()
  );
  const inbox = (product.inTheBox ?? []).filter(Boolean);
  const compat = (product.compatibility ?? []).filter((c) => c?.trim());
  const hasDesc = Boolean(product.description?.length);

  return {
    features,
    specs,
    inbox,
    compat,
    hasDesc,
    sections: SECTIONS.filter((s) => {
      if (s.id === "features") return features.length > 0;
      if (s.id === "specs") return specs.length > 0;
      if (s.id === "inbox") return inbox.length > 0;
      if (s.id === "compatibility") return compat.length > 0;
      return false;
    }),
  };
}

function ChapterBody({
  sectionId,
  features,
  specs,
  inbox,
  compat,
}: {
  sectionId: TabId;
  features: string[];
  specs: { label: string; value: string }[];
  inbox: string[];
  compat: string[];
}) {
  if (sectionId === "features" && features.length > 0) {
    return (
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {features.map((f, i) => (
          <li
            key={i}
            className="gadget-detail-card flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--g-sage)_22%,var(--g-line))] bg-[color-mix(in_srgb,var(--g-sage)_10%,var(--g-cream))] px-3.5 py-3.5 text-sm leading-relaxed text-[var(--g-charcoal)]"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-[var(--g-cream)]">
              <Check className="h-3.5 w-3.5 stroke-[2.4]" aria-hidden />
            </span>
            <span>
              <span className="gadget-display mr-1.5 text-[13px] text-[var(--g-forest)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {f}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (sectionId === "specs" && specs.length > 0) {
    return (
      <dl className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--g-sage)_24%,var(--g-line))]">
        {specs.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "gadget-detail-card grid grid-cols-[110px_1fr] items-baseline gap-3 px-4 py-3 sm:grid-cols-[168px_1fr]",
              i % 2 === 0
                ? "bg-[color-mix(in_srgb,var(--g-sage)_10%,var(--g-cream-deep))]"
                : "bg-[var(--g-cream)]"
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <dt className="gadget-eyebrow truncate pr-2 text-[0.62rem]">{s.label}</dt>
            <dd className="gadget-display text-[1.02rem] font-medium tracking-[-0.02em] text-[var(--g-forest)]">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (sectionId === "inbox" && inbox.length > 0) {
    return (
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {inbox.map((item, i) => (
          <li
            key={i}
            className="gadget-detail-card gadget-ticket-well flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-sm text-[var(--g-charcoal)]"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <span className="gadget-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--g-forest)] text-[13px] text-[var(--g-cream)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (sectionId === "compatibility" && compat.length > 0) {
    return (
      <ul className="flex flex-wrap gap-2">
        {compat.map((c, i) => (
          <li
            key={c}
            className="gadget-detail-card gadget-chip gadget-chip-idle rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--g-forest)]"
            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
          >
            {c}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

export function GadgetProductTabs({ product }: { product: Product }) {
  const baseId = useId();
  const { features, specs, inbox, compat, hasDesc, sections } = visibleFor(product);
  const [openId, setOpenId] = useState<TabId | "">("");

  if (!hasDesc && sections.length === 0) return null;

  const activeIndex = sections.findIndex((s) => s.id === openId);
  const active = activeIndex >= 0 ? sections[activeIndex] : null;
  const num = active ? String(activeIndex + 1).padStart(2, "0") : "";
  const panelId = `${baseId}-page`;

  function toggleChapter(id: TabId) {
    setOpenId((current) => (current === id ? "" : id));
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = sections.length - 1;
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
    document.getElementById(`${baseId}-tab-${sections[next].id}`)?.focus();
  }

  return (
    <section className="mx-auto mt-10 max-w-5xl sm:mt-12" aria-label="Product details">
      <header className="mb-5 px-0.5">
        <p className="gadget-eyebrow">The piece</p>
        <h2 className="gadget-h2 mt-1 text-[var(--g-charcoal)]">Look closer</h2>
      </header>

      {hasDesc && product.description ? (
        <GadgetProductReadMore blocks={product.description} />
      ) : null}

      {sections.length === 0 ? null : (
      <div
        className={cn(
          "mt-4 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[var(--g-cream)]",
          active && "md:grid md:grid-cols-[minmax(14rem,16.5rem)_minmax(0,1fr)]",
          hasDesc && "mt-5"
        )}
      >
        <div
          role="tablist"
          aria-label="Chapters"
          aria-orientation="vertical"
          className={cn(
            "flex flex-col bg-[color-mix(in_srgb,var(--g-sage)_10%,var(--g-cream-deep))]",
            active && "border-b border-[var(--g-line)] md:border-b-0 md:border-r md:border-r-[color-mix(in_srgb,var(--g-sage)_22%,var(--g-line))]"
          )}
        >
          {sections.map((section, index) => {
            const isOpen = section.id === active?.id;
            const Icon = section.Icon;
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
                aria-controls={panelId}
                onClick={() => toggleChapter(section.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={cn(
                  "group relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 sm:px-5",
                  "focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--g-forest)]",
                  isOpen
                    ? "bg-[color-mix(in_srgb,var(--g-forest)_12%,var(--g-sand))] text-[var(--g-forest)]"
                    : "text-[var(--g-charcoal)] hover:bg-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-cream))] hover:text-[var(--g-forest)]"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-2 left-0 w-0.5 rounded-full transition-colors duration-200",
                    isOpen
                      ? "bg-[var(--g-forest)]"
                      : "bg-transparent group-hover:bg-[var(--g-sage)]"
                  )}
                />
                <span
                  className={cn(
                    "gadget-display w-7 shrink-0 text-[14px] tabular-nums transition-colors duration-200",
                    isOpen
                      ? "text-[var(--g-forest)]"
                      : "text-[var(--g-taupe)] group-hover:text-[var(--g-forest)]"
                  )}
                >
                  {chapter}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
                    isOpen
                      ? "border-[var(--g-forest)] bg-[var(--g-forest)] text-[var(--g-cream)]"
                      : "border-[color-mix(in_srgb,var(--g-sage)_35%,var(--g-line))] bg-[var(--g-cream)] text-[var(--g-forest)] group-hover:border-[var(--g-forest)] group-hover:bg-[var(--g-forest)] group-hover:text-[var(--g-cream)]"
                  )}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5 stroke-[1.75]" />
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight transition-colors duration-200 sm:text-[15px]">
                  {section.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 stroke-[1.75] transition-all duration-200",
                    isOpen
                      ? "rotate-180 text-[var(--g-forest)]"
                      : "text-[var(--g-taupe)] group-hover:text-[var(--g-forest)]"
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        {active ? (
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={`${baseId}-tab-${active.id}`}
            className="relative bg-[color-mix(in_srgb,var(--g-sage)_8%,var(--g-sand))] px-5 py-6 sm:px-8 sm:py-8"
          >
            <span
              aria-hidden
              className="gadget-display pointer-events-none absolute right-5 top-4 select-none text-xl leading-none text-[var(--g-forest)]/15 sm:right-7 sm:top-5 sm:text-2xl"
            >
              {num}
            </span>
            <p className="gadget-eyebrow relative">
              {num} · {active.label}
            </p>
            <div className="relative mt-5">
              <ChapterBody
                sectionId={active.id}
                features={features}
                specs={specs}
                inbox={inbox}
                compat={compat}
              />
            </div>
          </div>
        ) : null}
      </div>
      )}
    </section>
  );
}
