"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentChoice,
} from "@/components/legal/cookie-consent-bar";
import {
  shouldLoadTikTokPixel,
  tiktokPixelBootstrapSource,
} from "@/lib/tiktok-pixel-rules";

function readConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return raw === "all" || raw === "essential" ? raw : null;
}

function clientHost(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

/**
 * Official TikTok Pixel base code only (load + page).
 * No ecommerce events, Events API, Advanced Matching, or SPA page listeners.
 */
export function TikTokPixel() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    setConsent(readConsent());
    setHost(clientHost());

    function onConsent(event: Event) {
      const detail = (event as CustomEvent<CookieConsentChoice>).detail;
      if (detail === "all" || detail === "essential") {
        setConsent(detail);
        return;
      }
      setConsent(readConsent());
    }

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
  }, []);

  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "";
  const enabled = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;
  const load = shouldLoadTikTokPixel({
    pixelId,
    enabled,
    consent,
    pathname,
    nodeEnv: process.env.NODE_ENV,
    host,
  });

  if (!load) return null;

  return (
    <Script
      id="tiktok-pixel-base"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: tiktokPixelBootstrapSource(pixelId.trim()),
      }}
    />
  );
}
