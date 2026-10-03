import { MessageCircle, ShoppingBag, Wallet } from "lucide-react";

const STEPS = [
  {
    icon: ShoppingBag,
    title: "Place order",
    detail: "Name, phone & address only",
  },
  {
    icon: MessageCircle,
    title: "We confirm",
    detail: "Quick call or WhatsApp",
  },
  {
    icon: Wallet,
    title: "Pay on delivery",
    detail: "Cash when parcel arrives",
  },
] as const;

/** Plain-language COD flow so first-time shoppers know what happens next. */
export function GadgetPdpHowItWorks() {
  return (
    <div className="mt-5 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3.5 sm:p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--g-sage)]">
        How ordering works
      </p>
      <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-2.5 sm:flex-col sm:items-center sm:text-center"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)]/10 text-[var(--g-forest)] sm:mx-auto">
              <step.icon className="h-4 w-4" aria-hidden strokeWidth={2} />
            </span>
            <div className="min-w-0 sm:pt-0.5">
              <p className="text-sm font-bold text-[var(--g-charcoal)]">
                <span className="mr-1.5 tabular-nums text-[var(--g-sage)] sm:hidden">
                  {i + 1}.
                </span>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-[var(--g-taupe)]">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
