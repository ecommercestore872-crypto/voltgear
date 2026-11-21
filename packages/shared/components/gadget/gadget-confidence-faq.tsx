import {
  Banknote,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";

const PILLARS = [
  {
    icon: Banknote,
    title: "Cash on Delivery",
    detail: "Pay the rider when your order arrives",
  },
  {
    icon: Truck,
    title: "Free Delivery",
    detail: "All over Pakistan, no hidden charges",
  },
  {
    icon: ShieldCheck,
    title: "1 Year Warranty",
    detail: "Official Buy n Try warranty",
  },
  {
    icon: RefreshCw,
    title: "7 Days Replacement",
    detail: "Wrong, damaged or faulty item replaced",
  },
] as const;

const FAQS = [
  {
    q: "Is Cash on Delivery available?",
    a: "Yes. You can choose cash on delivery and pay the rider in cash at the time of delivery. You can also pay online with your debit or credit card.",
  },
  {
    q: "Are there any delivery charges?",
    a: "No. Delivery is free all over Pakistan and all prices include taxes. Please do not pay the rider anything other than the item price.",
  },
  {
    q: "How long does delivery take?",
    a: "Usually up to 5-6 working days in major cities and 7-8 working days in other cities. It may take longer during sales and holidays.",
  },
  {
    q: "What if my product is damaged or faulty?",
    a: "We will process a replacement. Report a wrong or physically damaged item within 24 hours of receiving it, and a functionality issue (Bluetooth, display, calling) within 7 days. Keep the original box and accessories.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Yes, before it is dispatched. Our team calls to confirm your order, and orders usually ship within 4 hours, so ask for changes on that call.",
  },
] as const;

export function GadgetConfidenceFaq() {
  return (
    <section
      className="px-3 py-8 sm:px-5 sm:py-12 lg:px-8"
      aria-labelledby="confidence-heading"
    >
      <div className="mx-auto max-w-6xl space-y-10 sm:space-y-14">
        <div>
          <div className="login-section-head mb-5 sm:mb-7">
            <div>
              <p className="gadget-eyebrow mb-1.5">Buy n Try promise</p>
              <h2
                id="confidence-heading"
                className="login-section-title text-2xl sm:text-3xl"
              >
                Order with confidence
              </h2>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            {PILLARS.map(({ icon: Icon, title, detail }) => (
              <li
                key={title}
                className="flex flex-col items-start gap-3 rounded-[1.5rem] bg-white p-4 sm:p-6"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--g-forest)] text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="m-0 text-[15px] font-extrabold text-[var(--g-charcoal)] sm:text-base">
                    {title}
                  </p>
                  <p className="m-0 mt-1 text-[12px] leading-snug text-[var(--g-taupe)] sm:text-sm">
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="login-section-head mb-5 sm:mb-7">
            <div>
              <p className="gadget-eyebrow mb-1.5">FAQ</p>
              <h2 className="login-section-title text-2xl sm:text-3xl">
                Common questions
              </h2>
            </div>
          </div>
          <div className="space-y-2.5">
            {FAQS.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-[1.25rem] bg-white px-5 py-4 sm:px-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-[var(--g-charcoal)] sm:text-base [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--g-charcoal)]/75">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
