"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  AlignLeft,
  ChevronDown,
  ListChecks,
  Package,
  Play,
  Ruler,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { GadgetVideoPlayer, hasShopperProductVideo } from "@/components/gadget/gadget-video";
import { RichText } from "@/components/product/rich-text";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabId = "video" | "details" | "features" | "specs" | "inbox" | "compatibility";

const SECTIONS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "video", label: "View video", Icon: Play },
  { id: "details", label: "Full details", Icon: AlignLeft },
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
  const hasVideo = hasShopperProductVideo(product);

  return {
    features,
    specs,
    inbox,
    compat,
    hasDesc,
    hasVideo,
    sections: SECTIONS.filter((s) => {
      if (s.id === "video") return hasVideo;
      if (s.id === "details") return hasDesc;
      if (s.id === "features") return features.length > 0;
      if (s.id === "specs") return specs.length > 0;
      if (s.id === "inbox") return inbox.length > 0;
      if (s.id === "compatibility") return compat.length > 0;
      return false;
    }),
  };
}

function ChapterBody({
  product,
  sectionId,
  features,
  specs,
  inbox,
  compat,
  hasDesc,
  hasVideo,
}: {
  product: Product;
  sectionId: TabId;
  features: string[];
  specs: { label: string; value: string }[];
  inbox: string[];
  compat: string[];
  hasDesc: boolean;
  hasVideo: boolean;
}) {
  if (sectionId === "video" && hasVideo) {
    return <GadgetVideoPlayer product={product} />;
  }

  if (sectionId === "details" && hasDesc) {
    return (
      <div className="prose prose-sm max-w-none text-[var(--g-charcoal)] leading-relaxed sm:prose-base">
        <RichText blocks={product.description!} />
      </div>
    );
  }

  if (sectionId === "features" && features.length > 0) {
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl bg-[var(--g-cream-deep)] px-3.5 py-3 text-sm text-[var(--g-charcoal)]"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-[10px] font-bold text-[var(--g-cream)]">
              {i + 1}
            </span>
            {f}
          </li>
        ))}
      </ul>
    );
  }

  if (sectionId === "specs" && specs.length > 0) {
    return (
      <dl className="overflow-hidden rounded-xl border border-[var(--g-line)]">
        {specs.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5 text-sm sm:grid-cols-[160px_1fr]",
              i % 2 === 0 ? "bg-[var(--g-cream-deep)]" : "bg-[var(--g-cream)]"
            )}
          >
            <dt className="truncate pr-2 font-medium text-[var(--g-taupe)]">{s.label}</dt>
            <dd className="font-medium text-[var(--g-charcoal)]">{s.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (sectionId === "inbox" && inbox.length > 0) {
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {inbox.map((item, i) => (
          <li
            key={i}
            className="gadget-ticket-well flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-[var(--g-charcoal)]"
          >
            <Package className="h-4 w-4 shrink-0 text-[var(--g-forest)] stroke-[1.75]" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (sectionId === "compatibility" && compat.length > 0) {
    return (
      <ul className="flex flex-wrap gap-2">
        {compat.map((c) => (
          <li
            key={c}
            className="rounded-full border border-[var(--g-forest)]/20 bg-[var(--g-cream-deep)] px-3.5 py-1.5 text-sm font-medium text-[var(--g-forest)]"
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
  const { features, specs, inbox, compat, hasDesc, hasVideo, sections } = visibleFor(product);
  const [openId, setOpenId] = useState<TabId | "">("");

  if (sections.length === 0) return null;

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

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[var(--g-cream)]",
          active && "md:grid md:grid-cols-[minmax(14rem,16.5rem)_minmax(0,1fr)]"
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
                product={product}
                sectionId={active.id}
                features={features}
                specs={specs}
                inbox={inbox}
                compat={compat}
                hasDesc={hasDesc}
                hasVideo={hasVideo}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
