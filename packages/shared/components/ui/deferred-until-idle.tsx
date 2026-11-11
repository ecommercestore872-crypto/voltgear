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
  timeoutMs = 7000,
}: {
  children: ReactNode;
  timeoutMs?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unmounted = false;
    const mark = () => {
      if (!unmounted) setReady(true);
    };

    const onUserInteraction = () => {
      mark();
      cleanup();
    };

    const events = ["scroll", "touchstart", "click", "keydown"] as const;
    events.forEach((ev) =>
      window.addEventListener(ev, onUserInteraction, { once: true, passive: true }),
    );

    const timerId = window.setTimeout(onUserInteraction, Math.max(timeoutMs, 30000));

    function cleanup() {
      events.forEach((ev) => window.removeEventListener(ev, onUserInteraction));
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    }

    return () => {
      unmounted = true;
      cleanup();
    };
  }, [timeoutMs]);

  if (!ready) return null;
  return <>{children}</>;
}
