import Link from "next/link";

import { AutopilotEnginePanel } from "@/components/admin/autopilot-engine-panel";
import { Card } from "@/components/ui/card";
import type { AutopilotConfig } from "@/lib/autopilot/config";
import { AUTOMATION_BLOCKS } from "@/lib/autopilot/honesty-rules";

export function AutopilotHonestyBoard({
  pendingCount,
  lowStockCount,
  postexTrackedCount,
  readyCount = 0,
  hold = [],
  config = { autoDispatch: false, autoRescue: false },
  postExReady = false,
  error,
}: {
  pendingCount: number;
  lowStockCount: number;
  postexTrackedCount: number;
  readyCount?: number;
  hold?: { orderId: string; reason: string }[];
  config?: AutopilotConfig;
  postExReady?: boolean;
  error?: boolean;
}) {
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Autopilot</h1>
        <p className="text-sm text-destructive">Could not load shop numbers. Open Orders and try again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Autopilot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Numbers are from the shop. Auto-book and tracking stay off until you turn them on. Ads
          and reorder are still not engines.
        </p>
      </div>
      <AutopilotEnginePanel
        config={config}
        postExReady={postExReady}
        readyCount={readyCount}
        hold={hold}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/orders"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex min-h-11 flex-col justify-center px-4 py-4 transition-colors hover:bg-accent">
            <p className="text-sm text-muted-foreground">Waiting to pack</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{pendingCount}</p>
          </Card>
        </Link>
        <Link
          href="/admin/products"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex min-h-11 flex-col justify-center px-4 py-4 transition-colors hover:bg-accent">
            <p className="text-sm text-muted-foreground">Low or zero units</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{lowStockCount}</p>
          </Card>
        </Link>
        <Link
          href="/admin/orders"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex min-h-11 flex-col justify-center px-4 py-4 transition-colors hover:bg-accent">
            <p className="text-sm text-muted-foreground">Have a PostEx tracking number</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{postexTrackedCount}</p>
          </Card>
        </Link>
      </div>

      <div className="space-y-3">
        {AUTOMATION_BLOCKS.map((block) => (
          <Card key={block.id} className="space-y-2 p-4">
            <h2 className="text-base font-semibold">{block.title}</h2>
            <p className="text-sm">{block.purpose}</p>
            <p className="text-sm text-muted-foreground">{block.truth}</p>
            <Link
              href={block.controlHref}
              className="inline-block text-sm font-medium underline underline-offset-2"
            >
              {block.controlLabel}
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
