"use client";

import { COOKIE_CONSENT_OPEN_EVENT } from "@/lib/cookie-consent";

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}
