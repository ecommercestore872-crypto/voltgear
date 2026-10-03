import { Check, Loader2 } from "lucide-react";

export default function OrderConfirmationLoading() {
  return (
    <div className="premium-royal-page-bg min-h-dvh border-t border-[var(--g-line)] pb-16 pt-8 text-[var(--g-charcoal)]">
      <div className="container mx-auto max-w-6xl animate-pulse space-y-6 px-4 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(16rem,28rem)]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--g-line)] bg-[var(--g-cream-deep)] p-8 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--g-forest)]/80">
              <Check className="h-8 w-8 text-[var(--g-cream)]" aria-hidden />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="mx-auto h-3 w-24 rounded bg-[var(--g-line)] sm:mx-0" />
              <div className="mx-auto h-8 w-56 max-w-full rounded bg-[var(--g-line)] sm:mx-0" />
              <div className="mx-auto h-4 w-full max-w-sm rounded bg-[var(--g-line)]/80 sm:mx-0" />
            </div>
          </div>
          <div className="h-40 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
          <div className="h-72 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)]" />
          <div className="h-96 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)]" />
        </div>
      </div>
      <p className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-[var(--g-forest)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading your confirmation…
      </p>
    </div>
  );
}
