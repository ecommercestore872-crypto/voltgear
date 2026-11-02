export type TrustItem = {
  key: string;
  title: string;
  detail: string;
  icon: "cod" | "shipping" | "returns" | "curated";
};

/** One calm facts line — no icon wells or tinted chips. */
export function GadgetTrustStrip({
  items,
  headline = "",
  accent = "",
}: {
  items: TrustItem[];
  headline?: string;
  accent?: string;
}) {
  if (items.length === 0) return null;

  const facts = items.map((item) =>
    item.detail ? `${item.title} · ${item.detail}` : item.title,
  );
  const lead = [headline.trim(), accent.trim()].filter(Boolean).join(" ");

  return (
    <section
      className="px-4 py-4 sm:px-6 lg:px-8"
      aria-label="Payment, shipping, and returns"
    >
      <div className="mx-auto max-w-6xl border-y border-[var(--g-line)] py-3.5">
        {lead ? (
          <p className="mb-1.5 text-center text-[12px] font-semibold text-[var(--g-charcoal)] sm:text-left">
            {lead}
          </p>
        ) : null}
        <p className="text-center text-[12px] leading-relaxed text-[var(--g-charcoal)]/80 sm:text-left sm:text-[13px]">
          {facts.join("  ·  ")}
        </p>
      </div>
    </section>
  );
}
