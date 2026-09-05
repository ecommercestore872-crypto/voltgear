import { SearchX } from "lucide-react";
import Link from "next/link";

import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";
import { CatalogView } from "@/components/catalog/catalog-view";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import {
  fetchCatalog,
  parseCatalogFilters,
} from "@/lib/catalog";
import type { BreadcrumbItem } from "@/components/catalog/catalog-breadcrumbs";
import { isDemoSession } from "@/lib/demo";
import { products2Href } from "@/lib/gadget-preview";

export const revalidate = 60;

export const metadata = {
  title: "Search",
  description: "Search our catalog of electronics accessories.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const filters = parseCatalogFilters(searchParams);
  const q = filters.query;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Search", current: true },
  ];

  if (!q) {
    return (
      <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
        <div className="border-b border-[var(--g-line)] bg-[var(--g-cream-deep)]">
          <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
            <h1 className="gadget-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              What are you looking for?
            </h1>
            <p className="mt-3 text-sm text-[var(--g-taupe)]">
              Search chargers, earbuds, power banks, and more.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
          <div className="rounded-2xl border border-dashed border-[var(--g-line)] bg-[var(--g-white)] p-10 text-center">
            <SearchX className="mx-auto h-10 w-10 text-[var(--g-taupe)]" />
            <p className="mt-4 text-lg font-medium">Search the catalog</p>
            <form action={products2Href()} method="GET" className="mx-auto mt-4 flex w-full min-w-0 max-w-md flex-col gap-2 sm:flex-row">
              <input
                type="search"
                name="q"
                placeholder="Search…"
                className="h-11 w-full min-w-0 rounded-full border border-[var(--g-line)] bg-[var(--g-cream)] px-4 text-base outline-none focus:border-[var(--g-forest)] sm:text-sm"
              />
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--g-forest)] px-5 text-sm font-semibold text-[var(--g-white)] sm:w-auto"
              >
                Search
              </button>
            </form>
            <p className="mt-4 text-sm text-[var(--g-taupe)]">
              Or browse{" "}
              <Link href={products2Href()} className="font-semibold text-[var(--g-forest)] hover:underline">
                all products
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  const result = await fetchCatalog(filters, { includeDemo: isDemoSession() });

  const rawParams: Record<string, string> = {};
  if (filters.query) rawParams.q = filters.query;
  if (filters.sort) rawParams.sort = filters.sort;
  if (filters.availability && filters.availability !== "all")
    rawParams.availability = filters.availability;
  if (filters.minPrice != null) rawParams.minPrice = String(filters.minPrice);
  if (filters.maxPrice != null) rawParams.maxPrice = String(filters.maxPrice);

  return (
    <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <CatalogBreadcrumbs items={breadcrumbs} />
        <CatalogView
          result={result}
          filters={filters}
          basePath="/search"
          rawParams={rawParams}
          title={`Results for “${q}”`}
          breadcrumbs={breadcrumbs}
          showCategoryPills={false}
          selectedCategory={null}
          categoryCounts={{}}
          emptyMessage={`No products found for “${q}”.`}
          emptyActionHref={products2Href()}
        />
      </div>
    </div>
  );
}
