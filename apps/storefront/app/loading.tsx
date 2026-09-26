/** Lightweight shell while RSC pages resolve (mobile ad landings). */
export default function StorefrontLoading() {
  return (
    <div
      className="min-h-[40vh] animate-pulse bg-[var(--g-cream)]"
      aria-busy="true"
      aria-label="Loading"
    />
  );
}
