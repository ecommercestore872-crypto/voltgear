"use client";

import { useEffect, useState } from "react";

import { COOKIE_CONSENT_CHANGE_EVENT, COOKIE_CONSENT_STORAGE_KEY, allowsAdvertising, browserPrivacyOptOut, parseCookieConsent, readCookieConsent, type CookieConsentChoice } from "@/lib/cookie-consent";

export const ADSENSE_READY_EVENT = "bnt-adsense-ready";

function readConsent(): CookieConsentChoice | null {
  return readCookieConsent();
}

/** Loads the site-wide AdSense tag only after optional-cookie consent. */
export function AdSenseLoader({ src }: { src: string }) {
  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);

  useEffect(() => {
    setConsent(readConsent());

    function onConsent(event: Event) {
      const choice = (event as CustomEvent<CookieConsentChoice>).detail;
      setConsent(parseCookieConsent(choice) ?? readConsent());
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_STORAGE_KEY) setConsent(readConsent());
    };

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!allowsAdvertising(consent) || browserPrivacyOptOut() || !src) return;

    const existing = document.getElementById("adsense-site-script");
    if (existing) {
      window.dispatchEvent(new Event(ADSENSE_READY_EVENT));
      return;
    }

    const script = document.createElement("script");
    script.id = "adsense-site-script";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = src;
    script.addEventListener("load", () => {
      window.dispatchEvent(new Event(ADSENSE_READY_EVENT));
    }, { once: true });
    document.head.appendChild(script);
  }, [consent, src]);

  return null;
}
