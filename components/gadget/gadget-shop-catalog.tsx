import Link from "next/link";
import { ShieldCheck, Truck, Wallet } from "lucide-react";

import { GadgetArrivalCard } from "@/components/gadget/gadget-arrival-card";
import { GadgetShopFindBar } from "@/components/gadget/gadget-shop-find-bar";
import type { ShopType } from "@/lib/categories";
import { products2Href } from "@/lib/gadget-preview";
import { cn, formatPrice } from "@/lib/utils";
import { warrantyLabel, type PublicSiteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";

export function GadgetShopCatalog({
  title,
  description,
  products,
  shopTypes,
  activeCategory,
  query,
  sort,
  config,
  breadcrumbs,
  basePath: catalogBasePath,
  flattenGrid,
}: {
  title: string;
  description: string;
  products: Product[];
  shopTypes: ShopType[];
  activeCategory?: string | null;
  query: string;
  sort: string;
  config: PublicSiteConfig;
  breadcrumbs: { label: string; href?: string }[];
  basePath?: string;
  flattenGrid?: boolean;
}) {
  const trust: { icon: typeof Wallet; label: string; detail: string }[] = [];
  if (config.codEnabled) {
    trust.push({
      icon: Wallet,
      label: "Cash on delivery",
      detail: "Pay when it arrives",
    });
  }
  if (config.warrantyMonths) {
    trust.push({
      icon: ShieldCheck,
      label: warrantyLabel(config.warrantyMonths),
      detail: "On covered products",
    });
  }
  if (config.freeShippingThreshold > 0) {
    trust.push({
      icon: Truck,
      label: `Free shipping over ${formatPrice(config.freeShippingThreshold)}`,
      detail: "On qualifying orders",
    });
  }

  const basePath =
    catalogBasePath ?? (activeCategory ? products2Href(activeCategory) : products2Href());
  const useFlatGrid = Boolean(flattenGrid || activeCategory);

  function categoryHref(slug?: string) {
    const href = slug ? products2Href(slug) : products2Href();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort && sort !== "featured") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `${href}?${qs}` : href;
  }

  return (
    <div className="bg-[var(--g-cream)] text-[var(--g-charcoal)]">
      <div className="relative overflow-hidden border-b border-[var(--g-line)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--g-sage)_22%,transparent),transparent_55%),linear-gradient(180deg,var(--g-cream-deep),var(--g-cream))]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-5 sm:py-6 lg:px-8">
          <div className="mb-4">
            <GadgetShopFindBar
              basePath={basePath}
              query={query}
              sort={sort}
              resultCount={products.length}
              categorySlug={activeCategory || undefined}
            />
          </div>
          <nav aria-label="Breadcrumb" className="text-[11px] font-medium tracking-wide text-[var(--g-taupe)] sm:text-xs">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`}>
                {i > 0 ? <span className="px-1.5 text-[var(--g-line)]">/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-[var(--g-forest)]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--g-charcoal)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--g-charcoal)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--g-taupe)] sm:text-[15px]">
            {description}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-3 sm:pb-12 sm:pt-4 lg:px-8">
        {useFlatGrid && !activeCategory ? null : (
        <div className="mt-3 sm:mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
            {activeCategory ? "Filter by type" : "Jump to category"}
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="navigation"
            aria-label="Product categories"
          >
            <Link
              href={categoryHref()}
              className={cn(
                "gadget-chip inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold sm:h-11 sm:px-5 sm:text-sm",
                !activeCategory && !flattenGrid ? "gadget-chip-active" : "gadget-chip-idle"
              )}
            >
              All products
            </Link>
            {shopTypes.map((t) => {
              const active = t.slug === activeCategory;
              return (
                <Link
                  key={t.slug}
                  href={activeCategory ? categoryHref(t.slug) : `#category-${t.slug}`}
                  className={cn(
                    "gadget-chip inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold sm:h-11 sm:text-sm",
                    active ? "gadget-chip-active" : "gadget-chip-idle"
                  )}
                >
                  {t.name}
                </Link>
              );
            })}
          </div>
        </div>
        )}

        {products.length ? (
          useFlatGrid ? (
            <ul className="gadget-product-grid mt-4 sm:mt-5 lg:mt-6">
              {products.map((p) => (
                <li key={p._id} className="min-w-0">
                  <GadgetArrivalCard product={p} isGrid />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 space-y-10">
              {(() => {
                // Group products by category
                const groups: Record<string, { name: string; slug: string; products: Product[] }> = {};
                for (const p of products) {
                  const catSlug = p.category || "other";
                  const matchingType = shopTypes.find((t) => t.slug === catSlug);
                  const catName = matchingType ? matchingType.name : p.category.replace("-", " ");
                  if (!groups[catSlug]) {
                    groups[catSlug] = { name: catName, slug: catSlug, products: [] };
                  }
                  groups[catSlug].products.push(p);
                }

                return Object.values(groups).map((group) => (
                  <section key={group.slug} id={`category-${group.slug}`} className="scroll-mt-24">
                    <div className="mb-3.5 flex items-center justify-between border-b border-[var(--g-line)] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <h2 className="gadget-display text-lg font-semibold tracking-tight text-[var(--g-charcoal)] sm:text-xl capitalize">
                          {group.name}
                        </h2>
                        <span className="rounded-full bg-[var(--g-cream-deep)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--g-taupe)]">
                          {group.products.length} {group.products.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <Link
                        href={categoryHref(group.slug)}
                        className="text-xs font-semibold text-[var(--g-forest)] transition hover:underline"
                      >
                        View all {group.name} →
                      </Link>
                    </div>
                    <ul className="gadget-product-grid">
                      {group.products.map((p) => (
                        <li key={p._id} className="min-w-0">
                          <GadgetArrivalCard product={p} isGrid />
                        </li>
                      ))}
                    </ul>
                  </section>
                ));
              })()}
            </div>
          )
        ) : (
          <div className="gadget-glass mt-8 rounded-2xl px-6 py-14 text-center">
            <p className="text-[var(--g-taupe)]">
              {query ? `No products match “${query}”.` : "No products match right now."}
            </p>
            <Link
              href={products2Href()}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--g-forest)]"
            >
              {query ? "Clear search" : "Browse all products"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
