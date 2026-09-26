import { BntSeal } from "@/components/brand/bnt-seal";
import { SHOPPER_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BntWordmark({
  invert = false,
  compact = false,
  priority = false,
  className,
}: {
  invert?: boolean;
  compact?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="inline-flex items-center gap-3" aria-hidden>
        <BntSeal
          invert={invert}
          className={cn(
            "shop-brand-shine shrink-0",
            compact ? "h-9 min-w-9 sm:h-10 sm:min-w-10" : "h-10 min-w-10 sm:h-11 sm:min-w-11",
          )}
        />
        <span
          className={cn(
            "h-8 w-px self-center sm:h-9",
            invert
              ? "bg-[color-mix(in_srgb,var(--g-cream)_28%,transparent)]"
              : "bg-[var(--g-line)]",
          )}
        />
        <span className="min-w-0">
          <span
            className={cn(
              "bnt-lockup",
              invert ? "text-[var(--g-cream)]" : "text-[var(--g-forest)]",
            )}
          >
            Buy
            <span className="bnt-lockup-n">n</span>
            Try
          </span>
          <span className="bnt-lockup-rule" />
          {compact ? null : (
            <span
              className={cn(
                "bnt-lockup-tag hidden sm:block",
                invert
                  ? "text-[color-mix(in_srgb,var(--g-sage)_45%,white)]"
                  : "text-[var(--g-sage)]",
              )}
            >
              Buy it · Try it
            </span>
          )}
        </span>
      </span>
      <span className="sr-only">{SHOPPER_BRAND.spokenName}</span>
    </span>
  );
}
