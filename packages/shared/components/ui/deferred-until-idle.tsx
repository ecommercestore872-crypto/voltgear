"use client";

import { useEffect, useState, type ReactNode } from "react";

type IdleWindow = Window & {
  requestIdleCallback: (
    cb: () => void,
    opts?: { timeout: number },
  ) => number;
  cancelIdleCallback: (id: number) => void;
};

/**
 * Mount children after idle — keeps first paint fast on mobile Safari (iOS).
 * Use for promos, compare bar, extra analytics chrome, etc.
 */
export function DeferredUntilIdle({
  children,
  timeoutMs = 4500,
}: {
  children: ReactNode;
  timeoutMs?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mark = () => setReady(true);
    const win = window as IdleWindow;
    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(mark, { timeout: timeoutMs });
      return () => win.cancelIdleCallback(id);
    }
    const t = window.setTimeout(mark, Math.min(timeoutMs, 2200));
    return () => window.clearTimeout(t);
  }, [timeoutMs]);

  if (!ready) return null;
  return <>{children}</>;
}
