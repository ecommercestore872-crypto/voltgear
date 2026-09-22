import type { ReactNode } from "react";

export function AdminStickyPublishBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-[var(--g-cream)]/95 px-4 py-2 backdrop-blur-md lg:-mx-8 lg:px-8">
      {children}
    </div>
  );
}