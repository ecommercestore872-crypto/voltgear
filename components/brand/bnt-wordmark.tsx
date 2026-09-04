import { SHOPPER_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

function BntMonogram({ invert = false }: { invert?: boolean }) {
  const face = invert ? "#F7EFE2" : "#1B3D29";
  const ink = invert ? "#1B3D29" : "#F7EFE2";
  const leather = "#C45E32";

  return (
    <svg
      viewBox="0 0 40 40"
      className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" fill={face} />
      <circle cx="20" cy="20" r="16.6" fill="none" stroke={ink} strokeWidth="0.7" opacity="0.45" />
      <path
        d="M11.2 8.4 a12.4 12.4 0 0 1 17.6 0"
        fill="none"
        stroke={leather}
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <text
        x="20"
        y="23.2"
        textAnchor="middle"
        fill={ink}
        fontFamily="var(--font-gadget-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="8.4"
        fontWeight="650"
        letterSpacing="2.4"
      >
        {SHOPPER_BRAND.seal}
      </text>
    </svg>
  );
}

export function BntWordmark({
  invert = false,
  compact = false,
  className,
}: {
  invert?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="inline-flex items-center gap-3" aria-hidden>
        <BntMonogram invert={invert} />
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
