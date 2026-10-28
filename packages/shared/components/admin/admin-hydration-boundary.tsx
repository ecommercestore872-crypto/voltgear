"use client";

import React, { Suspense, type ReactNode } from "react";
import { adminDocumentReady } from "@/lib/admin-document-ready";

function ParsedAdminDocument({ children }: { children: ReactNode }) {
  const pending = adminDocumentReady(typeof document === "undefined" ? undefined : document, () => {
    // React's streamed HTML queues reveal DOM commits here, including commits
    // scheduled after DOMContentLoaded. Observe only; never replace or drain it.
    const reveals = typeof window === "undefined" ? undefined : (window as Window & { $RB?: unknown }).$RB;
    return Array.isArray(reveals) && reveals.length > 0;
  });
  if (pending) throw pending;
  return <>{children}</>;
}

/** Keep streamed server DOM intact until React can safely claim its nodes. */
export function AdminHydrationBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p role="status" className="p-4 text-sm text-muted-foreground">Loading admin…</p>}>
      <ParsedAdminDocument>{children}</ParsedAdminDocument>
    </Suspense>
  );
}
