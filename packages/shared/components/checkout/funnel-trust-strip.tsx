import { Banknote, MapPin, PackageCheck, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  {
    icon: Banknote,
    label: "Cash on delivery",
    sub: "Pay when it arrives",
  },
  {
    icon: MapPin,
    label: "Nationwide delivery",
    sub: "Courier booking after order",
  },
  {
    icon: PackageCheck,
    label: "Inspect at the door",
    sub: "Check before you pay",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp support",
    sub: "Help before you buy",
  },
] as const;

export function FunnelTrustStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 rounded-[10px] border border-[var(--g-line)] bg-[var(--g-white)] p-3 sm:grid-cols-4 sm:gap-3 sm:p-4",
        className,
      )}
      role="list"
      aria-label="Checkout reassurance"
    >
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <div
          key={label}
          role="listitem"
          className="flex min-w-0 items-start gap-2 sm:flex-col sm:items-center sm:text-center"
        >
          <Icon
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--g-forest)] sm:mt-0 sm:h-5 sm:w-5"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
              {label}
            </p>
            <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
              {sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
