export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--g-line)] border-t-[var(--g-forest)]"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Loading admin…</p>
    </div>
  );
}