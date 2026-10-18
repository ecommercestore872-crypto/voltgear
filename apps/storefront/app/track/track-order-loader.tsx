"use client";

import dynamic from "next/dynamic";

export const TrackOrderLoader = dynamic(
  () =>
    import("@/components/orders/track-order").then(
      (module) => module.TrackOrder,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[200px] animate-pulse rounded-2xl bg-[var(--g-line)]/30"
        aria-busy="true"
      />
    ),
  },
);
