import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVAILABILITY_OPTIONS, buildCatalogUrl } from "@/lib/catalog";
import type { CatalogAvailability } from "@/lib/catalog";

export function PriceFilter({
  basePath,
  baseParams,
  availability,
  minPrice,
  maxPrice,
}: {
  basePath: string;
  baseParams: Record<string, string>;
  availability?: CatalogAvailability;
  minPrice?: number;
  maxPrice?: number;
}) {
  const min = minPrice == null ? "" : String(minPrice);
  const max = maxPrice == null ? "" : String(maxPrice);
  const baseExcludingPrice = { ...baseParams };
  delete baseExcludingPrice.minPrice;
  delete baseExcludingPrice.maxPrice;

  const activeAvail =
    (AVAILABILITY_OPTIONS as readonly { value: string }[]).find(
      (o) => o.value === availability
    )?.value ?? "all";

  return (
    <form method="GET" action={basePath} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {Object.entries(baseExcludingPrice).map(([k, v]) => (
        <input type="hidden" name={k} value={v} key={k} />
      ))}
      <input type="hidden" name="availability" value={activeAvail} />
      <div className="min-w-0 flex-1 sm:max-w-[9rem]">
        <Label htmlFor="minPrice" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Min
        </Label>
        <Input id="minPrice" name="minPrice" type="number" min={0} placeholder="0" defaultValue={min} className="mt-1" />
      </div>
      <div className="min-w-0 flex-1 sm:max-w-[9rem]">
        <Label htmlFor="maxPrice" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Max
        </Label>
        <Input id="maxPrice" name="maxPrice" type="number" min={0} placeholder="Any" defaultValue={max} className="mt-1" />
      </div>
      <Button type="submit" size="sm" className="h-11 w-full sm:w-auto">
        Apply
      </Button>
      {(minPrice != null || maxPrice != null) && (
        <Link
          href={buildCatalogUrl(basePath, baseExcludingPrice, { page: "1" })}
          className="underline-offset-2 hover:underline text-xs"
        >
          Clear price
        </Link>
      )}
    </form>
  );
}
