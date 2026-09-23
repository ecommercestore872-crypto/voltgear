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

function getTimeRemaining(end: string) {
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
      className={`relative overflow-hidden bg-emerald-900 text-white ${className}`}
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
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              {config.message}
            </span>
            {time ? (
              <>
                <span className="text-emerald-500">•</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  ENDS IN
                </span>
                <span className="flex items-center gap-1">
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.days).padStart(2, "0")}
                  </span>
                  <span className="text-emerald-300">d</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.hours).padStart(2, "0")}
                  </span>
                  <span className="text-emerald-300">h</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-emerald-300">m</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                    {String(time.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-emerald-300">s</span>
                </span>
                <span className="text-emerald-500">•</span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
