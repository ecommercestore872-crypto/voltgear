import {
  CatalogBreadcrumbs,
  type BreadcrumbItem,
} from "@/components/catalog/catalog-breadcrumbs";
import { ActiveFilters } from "@/components/catalog/active-filters";
import { AvailabilityPills } from "@/components/catalog/availability-pills";
import { CategoryPills } from "@/components/catalog/category-pills";
import { MobileFilterSheet } from "@/components/catalog/mobile-filter-sheet";
import { PriceFilter } from "@/components/catalog/price-filter";
import { ProductGrid, EmptyState } from "@/components/catalog/product-grid";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { SortSelect } from "@/components/catalog/sort-select";
import type { ShopType } from "@/lib/categories";
import type { CatalogFilters, CatalogResult } from "@/lib/catalog";
import { CatalogSidebar } from "@/components/catalog/catalog-sidebar";
import {
  ShieldCheck,
  RefreshCcw,
  CheckCircle,
  Truck,
  LifeBuoy,
} from "lucide-react";

export interface CatalogViewProps {
  result: CatalogResult;
  filters: CatalogFilters;
  basePath: string;
  rawParams: Record<string, string>;
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  showCategoryPills: boolean;
  selectedCategory: string | null;
  categoryCounts: Record<string, number>;
  shopTypes?: ShopType[];
  emptyMessage: string;
  emptyActionHref?: string;
  query?: string;
}

export function CatalogView({
  result,
  filters,
  basePath,
  rawParams,
  title,
  subtitle,
  breadcrumbs,
  showCategoryPills,
  selectedCategory,
  categoryCounts,
  shopTypes,
  emptyMessage,
  emptyActionHref,
  query,
}: CatalogViewProps) {
  const { items, total, page, totalPages, pageSize } = result;
  const baseParams: Record<string, string> = { ...rawParams };
  delete baseParams.page;

  return (
    <section>
      <CatalogBreadcrumbs items={breadcrumbs} />
      <header className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
          )}
          {!subtitle && (
            <p className="mt-2 max-w-xl text-muted-foreground">
              Explore our complete range of premium tech accessories.
              <br />
              Quality you can trust. Performance you can feel.
            </p>
          )}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/20 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background drop-shadow border text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm">
                100% Original Products
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Sourced from trusted brands
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/20 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background drop-shadow border text-primary">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm">1 Year Warranty</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Peace of mind guaranteed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/20 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background drop-shadow border text-primary">
              <RefreshCcw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm">
                7 Days Easy Returns
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Hassle-free returns
              </p>
            </div>
          </div>
        </div>
      </header>

      {showCategoryPills && (
        <CategoryPills
          basePath={basePath}
          selected={selectedCategory}
          counts={categoryCounts}
          shopTypes={shopTypes}
        />
      )}

      <div className="lg:flex lg:gap-8">
        <aside className="hidden w-56 flex-shrink-0 lg:block xl:w-64">
          <div className="sticky top-24 space-y-6">
            <CatalogSidebar
              basePath={basePath}
              baseParams={baseParams}
              availability={filters.availability}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
            />
          </div>
        </aside>

        <main className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)} of {total} products
            </span>
            <div className="flex items-center gap-3">
              <SortSelect
                basePath={basePath}
                baseParams={baseParams}
                value={filters.sort}
              />
              <MobileFilterSheet basePath={basePath}>
                <AvailabilityPills
                  basePath={basePath}
                  baseParams={baseParams}
                  value={filters.availability}
                />
                <PriceFilter
                  basePath={basePath}
                  baseParams={baseParams}
                  availability={filters.availability}
                  minPrice={filters.minPrice}
                  maxPrice={filters.maxPrice}
                />
              </MobileFilterSheet>
            </div>
          </div>

          <ActiveFilters
            basePath={basePath}
            baseParams={baseParams}
            sort={filters.sort}
            availability={filters.availability}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            query={query}
          />

          {items.length === 0 ? (
            <EmptyState
              message={emptyMessage}
              actionLabel={emptyActionHref ? "Browse all products" : undefined}
              actionHref={emptyActionHref}
            />
          ) : (
            <>
              <ProductGrid items={items} />
              <CatalogPagination
                page={page}
                totalPages={totalPages}
                basePath={basePath}
                baseParams={baseParams}
              />
            </>
          )}
        </main>
      </div>

      {/* Bottom Global Trust Banner */}
      <div className="mt-16 w-full border-t pt-10 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">Fast Delivery</p>
              <p className="text-xs text-muted-foreground">Across Pakistan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">Secure Payments</p>
              <p className="text-xs text-muted-foreground">
                100% Safe Checkout
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">7 Days Returns</p>
              <p className="text-xs text-muted-foreground">
                Easy & Hassle-free
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">1 Year Warranty</p>
              <p className="text-xs text-muted-foreground">On all products</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">Dedicated Support</p>
              <p className="text-xs text-muted-foreground">
                We&apos;re here to help
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
