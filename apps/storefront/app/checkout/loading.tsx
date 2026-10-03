/** Instant skeleton so checkout does not look blank while the client bundle loads. */
export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 lg:px-8">
      <div className="mb-4 space-y-2 lg:hidden">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--g-line)]/60" />
        <div className="h-4 w-full max-w-sm animate-pulse rounded bg-[var(--g-line)]/40" />
      </div>
      <div className="rounded-xl border border-[var(--g-line)] bg-card p-4 shadow-sm">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--g-line)]/50" />
              <div className="h-11 animate-pulse rounded-lg bg-[var(--g-line)]/35" />
            </div>
          ))}
          <div className="h-12 animate-pulse rounded-lg bg-[var(--g-forest)]/20" />
        </div>
      </div>
    </div>
  );
}
