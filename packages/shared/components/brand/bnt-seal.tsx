import { SHOPPER_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BntSeal({
  className,
  invert = false,
  priority = false,
}: {
  className?: string;
  invert?: boolean;
  priority?: boolean;
}) {
  void invert;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand asset; crisp at any DPR
    <img
      src={SHOPPER_BRAND.sealSrc}
      alt=""
      width={44}
      height={44}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "shrink-0 rounded-full object-cover",
        className,
      )}
      aria-hidden
    />
  );
}
