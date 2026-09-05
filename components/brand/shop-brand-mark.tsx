import { BntWordmark } from "@/components/brand/bnt-wordmark";
import { useSettingsLogo } from "@/lib/chrome-nav-rules";
import { cn } from "@/lib/utils";

export function ShopBrandMark({
  logo,
  name,
  invert = false,
  compact = false,
  priority = false,
  className,
}: {
  logo?: string | null;
  name: string;
  invert?: boolean;
  compact?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const src = useSettingsLogo(logo);
  if (!src) {
    return (
      <BntWordmark
        invert={invert}
        compact={compact}
        priority={priority}
        className={className}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "w-auto object-contain object-left",
        compact ? "h-8 sm:h-9" : "h-9 sm:h-10",
        className
      )}
    />
  );
}
