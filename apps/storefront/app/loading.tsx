/** Keep the storefront shape stable while a route streams in. */
export default function StorefrontLoading() {
  return (
    <div
      className="min-h-dvh bg-[var(--g-cream)] px-4 py-6 lg:px-8"
      role="status"
      aria-busy="true"
      aria-label="Loading the shop"
    >
      <div className="mx-auto max-w-6xl animate-pulse" aria-hidden>
        <div className="h-5 w-32 rounded bg-[var(--g-cream-deep)]" />
        <div className="mt-6 h-[min(60svh,32rem)] min-h-72 rounded-xl bg-[var(--g-cream-deep)]" />
        <div className="mt-6 h-5 w-48 rounded bg-[var(--g-cream-deep)]" />
      </div>
    </div>
  );
}
