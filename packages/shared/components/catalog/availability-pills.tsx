import Link from "next/link";

import { AVAILABILITY_OPTIONS, buildCatalogUrl } from "@/lib/catalog";
import type { CatalogAvailability } from "@/lib/catalog";

export function AvailabilityPills({
  basePath,
  baseParams,
  value,
}: {
  basePath: string;
  baseParams: Record<string, string>;
  value: CatalogAvailability;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Availability
      </span>
      {AVAILABILITY_OPTIONS.map((opt) => {
        const active = opt.value === value;
        const style =
          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
          (active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary/50 hover:bg-accent");
        return active ? (
          <span key={opt.value} className={style} aria-pressed="true">
            {opt.label}
          </span>
        ) : (
          <Link
            key={opt.value}
            href={buildCatalogUrl(basePath, baseParams, {
              availability: opt.value,
              page: "1",
            })}
            className={style}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
