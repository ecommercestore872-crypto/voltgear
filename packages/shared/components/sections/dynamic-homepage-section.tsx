import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import type { HomepageSection } from "@/lib/types";

export function DynamicHomepageSection({
  section,
}: {
  section: HomepageSection;
}) {
  const products = section.resolvedProducts ?? [];
  if (!products.length) return null;

  return (
    <section className="border-b bg-background">
      <div className="container mx-auto max-w-screen-xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
        {/* Section header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {section.subtitle}
              </p>
            )}
          </div>
          {section.showViewAll && section.viewAllHref && (
            <Link
              href={section.viewAllHref}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group"
            >
              View all
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          )}
        </div>

        {section.layout === "carousel" ? (
          /* Horizontal product rail */
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory">
            {products.map((product) => (
              <div
                key={product._id}
                className="w-[200px] sm:w-[220px] shrink-0 snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          /* Grid layout */
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-x-5 sm:gap-y-10">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
