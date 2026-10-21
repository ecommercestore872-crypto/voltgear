/** Lightweight shell while RSC pages resolve (mobile ad landings). */
export default function StorefrontLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center bg-[var(--g-cream)] px-6 py-12 text-[var(--g-forest)]"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="text-center">
        <p className="text-lg font-semibold">Buy n Try</p>
        <p className="mt-2 text-sm">Loading the shop…</p>
      </div>
    </div>
  );
}
