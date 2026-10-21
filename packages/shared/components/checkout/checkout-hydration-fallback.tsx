/**
 * Stable first render while the persisted cart is restored on the client.
 * Its reserved height keeps the footer out of view and prevents checkout CLS.
 */
export function CheckoutHydrationFallback() {
  return (
    <div
      className="premium-royal-page-bg min-h-[calc(100dvh-10rem)] overflow-hidden px-4 py-6 lg:px-8"
      aria-label="Loading checkout"
      aria-busy="true"
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
        <div className="space-y-4">
          <div className="h-7 w-52 animate-pulse rounded bg-black/10" />
          <div className="h-[28rem] animate-pulse rounded-2xl border bg-white/60" />
        </div>
        <div className="hidden h-[24rem] animate-pulse rounded-2xl border bg-white/60 lg:block" />
      </div>
    </div>
  );
}
