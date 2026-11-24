import {
  Check,
  ListChecks,
  Package,
  Ruler,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { GadgetChapterTabs } from "@/components/gadget/gadget-chapter-tabs";
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
    (s) => s?.label?.trim() && s?.value?.trim(),
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
                : "bg-[var(--g-cream)]",
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <dt className="gadget-eyebrow truncate pr-2 text-[0.62rem]">
              {s.label}
            </dt>
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
  const { features, specs, inbox, compat, hasDesc, sections } =
    visibleFor(product);

  if (!hasDesc && sections.length === 0) return null;

  return (
    <section
      className="mx-auto mt-10 max-w-5xl sm:mt-12"
      aria-label="Product details"
    >
      <header className="mb-5 px-0.5" id="product-details">
        <p className="gadget-eyebrow">Everything included</p>
        <h2 className="gadget-h2 mt-1 text-[var(--g-charcoal)]">
          What you&apos;re getting
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--g-taupe)]">
          Specs, features, and what arrives in the box — so you can buy with
          confidence.
        </p>
      </header>

      {hasDesc && product.description ? (
        <GadgetProductReadMore blocks={product.description} />
      ) : null}

      {sections.length === 0 ? null : (
        <GadgetChapterTabs
          hasDesc={hasDesc}
          chapters={sections.map((section) => ({
            id: section.id,
            label: section.label,
            icon: <section.Icon className="h-3.5 w-3.5 stroke-[1.75]" />,
            body: (
              <ChapterBody
                sectionId={section.id}
                features={features}
                specs={specs}
                inbox={inbox}
                compat={compat}
              />
            ),
          }))}
        />
      )}
    </section>
  );
}
