import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CheckoutSummaryPriceRow({
  label,
  value,
  tone = "muted",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "muted" | "deal" | "strong";
}) {
  return (
    <div className="flex items-start justify-between gap-x-4 gap-y-1 text-[13px] leading-snug">
      <span
        className={cn(
          "shrink-0",
          tone === "deal" && "font-semibold text-[var(--g-sage)]",
          tone === "muted" && "text-muted-foreground",
          tone === "strong" && "font-semibold text-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-right tabular-nums",
          tone === "deal" && "font-semibold text-[var(--g-sage)]",
          tone === "muted" && "font-semibold text-foreground",
          tone === "strong" && "font-bold text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
