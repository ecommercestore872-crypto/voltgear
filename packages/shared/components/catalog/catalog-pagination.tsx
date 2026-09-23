import Link from "next/link";

import { buildCatalogUrl } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  baseParams: Record<string, string>;
  className?: string;
}

function pageUrl(basePath: string, base: Record<string, string>, page: number) {
  return buildCatalogUrl(basePath, base, { page: String(page) });
}

function PageLink({
  page,
  basePath,
  base,
  children,
  current,
  disabled,
}: {
  page: number;
  basePath: string;
  base: Record<string, string>;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium text-muted-foreground/50"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={pageUrl(basePath, base, page)}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium outline-none ring-primary focus-visible:ring-2",
        current
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent",
      )}
    >
      {children}
    </Link>
  );
}

export function CatalogPagination({
  page,
  totalPages,
  basePath,
  baseParams,
  className,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn("mt-8 flex items-center justify-center gap-1", className)}
    >
      <PageLink
        page={1}
        basePath={basePath}
        base={baseParams}
        disabled={page <= 1}
      >
        First
      </PageLink>
      <PageLink
        page={page - 1}
        basePath={basePath}
        base={baseParams}
        disabled={page <= 1}
      >
        Previous
      </PageLink>
      {pages.map((p, i) =>
        typeof p === "number" ? (
          <PageLink
            key={p}
            page={p}
            basePath={basePath}
            base={baseParams}
            current={p === page}
          >
            {p}
          </PageLink>
        ) : (
          <span
            key={`sep-${i}`}
            aria-hidden
            className="flex h-9 min-w-9 items-center justify-center text-sm font-medium text-muted-foreground/60"
          >
            {p}
          </span>
        ),
      )}
      <PageLink
        page={page + 1}
        basePath={basePath}
        base={baseParams}
        disabled={page >= totalPages}
      >
        Next
      </PageLink>
      <PageLink
        page={totalPages}
        basePath={basePath}
        base={baseParams}
        disabled={page >= totalPages}
      >
        Last
      </PageLink>
    </nav>
  );
}
