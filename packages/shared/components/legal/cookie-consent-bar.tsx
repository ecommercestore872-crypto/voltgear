"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_OPEN_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  allowsAdvertising,
  allowsAnalytics,
  consentFromPreferences,
  optionalConsentRevoked,
  parseCookieConsent,
  readCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookie-consent";

function recordConsentMetric(event: "shown" | "opened" | "saved", choice?: CookieConsentChoice) {
  void fetch("/api/consent/aggregate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, choice }),
    cache: "no-store",
    credentials: "omit",
    keepalive: true,
    referrerPolicy: "no-referrer",
  }).catch(() => {});
}

export function CookieConsentBar() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<CookieConsentChoice | null | "unknown">("unknown");
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [error, setError] = useState("");
  const analyticsInput = useRef<HTMLInputElement>(null);
  const manageButton = useRef<HTMLButtonElement>(null);

  function showManage() {
    setManaging(true);
    window.requestAnimationFrame(() => analyticsInput.current?.focus());
  }

  function leaveManage() {
    setManaging(false);
    window.requestAnimationFrame(() => manageButton.current?.focus());
  }

  useEffect(() => {
    const saved = readCookieConsent();
    setChoice(saved);
    setOpen(!saved);
    if (!saved) recordConsentMetric("shown");

    const showPreferences = () => {
      const current = readCookieConsent();
      setAnalytics(allowsAnalytics(current));
      setAdvertising(allowsAdvertising(current));
      setManaging(true);
      setError("");
      setOpen(true);
      recordConsentMetric("opened");
      window.requestAnimationFrame(() => analyticsInput.current?.focus());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null) {
        // Clearing site data in another tab can revoke optional permission.
        window.location.reload();
        return;
      }
      if (event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      const next = parseCookieConsent(event.newValue);
      if (optionalConsentRevoked(event.oldValue, next)) {
        // Already loaded third-party SDKs cannot reliably be unloaded in place.
        window.location.reload();
        return;
      }
      setChoice(next);
      setOpen(!next);
      setManaging(false);
    };
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, showPreferences);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, showPreferences);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/studio") ||
      choice === "unknown" || !open) return null;

  function save(next: CookieConsentChoice) {
    const previous = readCookieConsent();
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, next);
    } catch {
      setError("Your browser could not save this choice. Please check storage settings and try again.");
      return;
    }
    setChoice(next);
    setOpen(false);
    setError("");
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, { detail: next }));
    recordConsentMetric("saved", next);
    // Reload to remove optional SDKs already loaded before a preference was revoked.
    if (optionalConsentRevoked(previous, next)) window.location.reload();
  }

  const actionClass = "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (choice) setOpen(false);
          else leaveManage();
        }
      }}
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[100] mx-auto max-h-[min(70dvh,24rem)] max-w-sm overflow-y-auto rounded-xl border border-border bg-background p-3 text-foreground shadow-lg sm:inset-x-auto sm:bottom-5 sm:left-5 sm:mx-0 sm:w-[360px] sm:p-4"
    >
      <h2 id="cookie-consent-title" className="text-sm font-bold">Your privacy choices</h2>
      <p id="cookie-consent-description" className="mt-1 text-xs leading-snug text-muted-foreground">
        Necessary storage keeps the shop working. Optional analytics improves pages; advertising enables ads and purchase measurement.
      </p>
      {managing ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-muted px-3 py-2 text-xs">Necessary storage is always on.</p>
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-2 text-xs">
            <input ref={analyticsInput} type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <span><strong className="block">Analytics</strong><span className="text-muted-foreground">Helps us understand site use and improve pages.</span></span>
          </label>
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-2 text-xs">
            <input type="checkbox" checked={advertising} onChange={(event) => setAdvertising(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <span><strong className="block">Advertising</strong><span className="text-muted-foreground">Allows Meta, TikTok and Google ad services and purchase measurement.</span></span>
          </label>
          <button type="button" className={actionClass} onClick={() => save(consentFromPreferences(analytics, advertising))}>Save preferences</button>
          <button type="button" className="min-h-11 w-full rounded-lg text-xs underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={leaveManage}>Back to choices</button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={actionClass} onClick={() => save("all")}>Accept all</button>
          <button type="button" className={actionClass} onClick={() => save("essential")}>Reject optional</button>
          <button ref={manageButton} type="button" className="col-span-2 min-h-11 rounded-lg text-xs font-semibold text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={showManage}>Manage preferences</button>
        </div>
      )}
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        Change this later in the footer. Read our <Link href="/privacy-policy" className="underline">Privacy Policy</Link> and <Link href="/cookies" className="underline">Cookie Policy</Link>.
      </p>
    </div>
  );
}
