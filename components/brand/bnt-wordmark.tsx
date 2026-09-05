import { SHOPPER_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

function BntSealMark({
  compact = false,
  priority = false,
}: {
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand asset; keep off next/image so chrome stays a client-safe img
    <img
      src={SHOPPER_BRAND.sealSrc}
      alt=""
      width={44}
      height={44}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "shrink-0 rounded-full object-cover",
        compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-11 sm:w-11"
      )}
    />
  );
}

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
        <BntSealMark compact={compact} priority={priority} />
        <span
          className={cn(
            "h-8 w-px self-center sm:h-9",
            invert ? "bg-[color-mix(in_srgb,var(--g-cream)_28%,transparent)]" : "bg-[var(--g-line)]"
          )}
        />
        <span className="min-w-0">
          <span
            className={cn(
              "bnt-lockup",
              invert ? "text-[var(--g-cream)]" : "text-[var(--g-forest)]"
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
                invert ? "text-[color-mix(in_srgb,var(--g-sage)_45%,white)]" : "text-[var(--g-sage)]"
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
