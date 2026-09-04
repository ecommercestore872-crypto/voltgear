import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { CatalogFact } from "@/lib/autopilot/honesty-rules";
import { formatPrice } from "@/lib/utils";

export function AutopilotCatalogFacts({
  products,
  error,
}: {
  products: CatalogFact[];
  error?: boolean;
}) {
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Catalog facts</h1>
        <p className="text-sm text-destructive">Could not load products.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catalog facts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ad accounts are not connected. Price and units are from your products. There is no ROAS
          or ad spend here.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/admin/autopilot/settings" className="underline underline-offset-2">
            Back to Autopilot
          </Link>
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published products yet.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 transition-colors hover:bg-accent">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatPrice(p.price)} · {p.units} units
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
