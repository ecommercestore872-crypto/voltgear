import { SHOPPER_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BntSeal({
  className,
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-[7px] px-1.5 text-[10px] font-semibold tracking-[0.14em]",
        invert
          ? "bg-[var(--g-cream)] text-[var(--g-forest)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
          : "bg-[var(--g-forest)] text-[var(--g-cream)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_0_rgba(31,54,38,0.35)]",
        className
      )}
      aria-hidden
    >
      {SHOPPER_BRAND.seal}
    </span>
  );
}
