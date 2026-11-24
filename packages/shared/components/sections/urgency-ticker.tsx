"use client";

import { useEffect, useState } from "react";

import {
  isAnnouncementCountdownActive,
  type AnnouncementConfig,
} from "@/lib/site-config";

interface UrgencyTickerProps {
  announcement?: AnnouncementConfig;
  className?: string;
}

const INACTIVE: AnnouncementConfig = {
  enabled: false,
  message: null,
  countdownEnabled: false,
  startsAt: null,
  endsAt: null,
};

export function getTimeRemaining(end: string) {
  const diff = Math.max(0, new Date(end).getTime() - Date.now());

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function UrgencyTicker({
  announcement,
  className = "",
}: UrgencyTickerProps) {
  const config = announcement ?? INACTIVE;
  const [now, setNow] = useState(() => Date.now());

  const showBar = config.enabled && Boolean(config.message);
  const countdownActive = isAnnouncementCountdownActive(config, now);

  useEffect(() => {
    if (!showBar || !config.countdownEnabled) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [showBar, config.countdownEnabled]);

  if (!showBar) return null;

  const time =
    countdownActive && config.endsAt ? getTimeRemaining(config.endsAt) : null;

  return (
    <div
      className={`gadget-urgency-bar relative overflow-hidden ${className}`}
      role="region"
      aria-label="Announcement"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes ticker-scroll-reduced {
  0% { transform: translateX(0); }
  100% { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: ticker-scroll-reduced 0s linear !important; }
}
`,
        }}
      />
      <p className="sr-only">{config.message}</p>
      <div
        className="ticker-track flex whitespace-nowrap py-2.5"
        style={{
          animation: "ticker-scroll 30s linear infinite",
          width: "max-content",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-6"
            aria-hidden={i > 0}
          >
            <span className="gadget-urgency-accent text-xs font-semibold uppercase tracking-wider">
              {config.message}
            </span>
            {time ? (
              <>
                <span className="gadget-urgency-accent opacity-70">•</span>
                <span className="gadget-urgency-accent text-xs font-semibold uppercase tracking-wider">
                  ENDS IN
                </span>
                <span className="flex items-center gap-1">
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.days).padStart(2, "0")}
                  </span>
                  <span className="gadget-urgency-accent text-[10px]">d</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.hours).padStart(2, "0")}
                  </span>
                  <span className="gadget-urgency-accent text-[10px]">h</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.minutes).padStart(2, "0")}
                  </span>
                  <span className="gadget-urgency-accent text-[10px]">m</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.seconds).padStart(2, "0")}
                  </span>
                  <span className="gadget-urgency-accent text-[10px]">s</span>
                </span>
                <span className="gadget-urgency-accent opacity-70">•</span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Sale ends in 00:59:12" to a real instant, so every visitor sees the same time; hides at zero. */
export function SaleCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  // null until mounted: server and first client render match (no hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null || new Date(endsAt).getTime() <= now) return null;
  const t = getTimeRemaining(endsAt);
  const hh = String(t.days * 24 + t.hours).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg bg-[var(--g-sale)] px-3.5 py-2.5 text-white ${className}`}
      role="timer"
    >
      <span className="text-sm font-semibold">Sale ends in</span>
      <span className="text-xl font-extrabold tabular-nums leading-none">
        {hh}:{pad(t.minutes)}:{pad(t.seconds)}
      </span>
    </div>
  );
}
