"use client";

import { useEffect, useState } from "react";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentChoice,
} from "@/components/legal/cookie-consent-bar";

export const ADSENSE_READY_EVENT = "bnt-adsense-ready";

function readConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return value === "all" || value === "essential" ? value : null;
}

/** Loads the site-wide AdSense tag only after optional-cookie consent. */
export function AdSenseLoader({ src }: { src: string }) {
  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);

  useEffect(() => {
    setConsent(readConsent());

    function onConsent(event: Event) {
      const choice = (event as CustomEvent<CookieConsentChoice>).detail;
      setConsent(choice === "all" || choice === "essential" ? choice : readConsent());
    }

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (consent !== "all" || !src) return;

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
