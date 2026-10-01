export default function ProductLoading() {
  return (
    <div className="gadget-scroll-pad-cta bg-[var(--g-cream)] px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-[var(--g-line)]/60" />
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="aspect-square rounded-2xl bg-[var(--g-line)]/50" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-[var(--g-line)]/50" />
            <div className="h-6 w-1/3 rounded bg-[var(--g-line)]/40" />
            <div className="h-24 rounded-xl bg-[var(--g-line)]/30" />
            <div className="h-12 rounded-lg bg-[var(--g-line)]/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
