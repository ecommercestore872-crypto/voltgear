"use client";

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
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return raw === "all" || raw === "essential" ? raw : null;
  } catch {
    return null;
  }
}

function clientHost(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

/** Load the Pixel after advertising consent and count client-side navigations. */
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
    return () =>
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
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

  useEffect(() => {
    const script = document.getElementById("tiktok-pixel-base");
    if (!script) return;
    if (consent === "all") window.ttq?.grantConsent?.();
    else {
      window.ttq?.revokeConsent?.();
      // A later grant must count the current page after tracking resumes.
      script.dataset.page = "";
    }
  }, [consent]);

  useEffect(() => {
    if (!load || !pixelId.trim()) return;
    const page = window.location.pathname + window.location.search;
    const existing = document.getElementById("tiktok-pixel-base");
    if (existing) {
      if (existing.dataset.page !== page) {
        window.ttq?.page?.();
        existing.dataset.page = page;
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "tiktok-pixel-base";
    script.dataset.page = page;
    script.text = tiktokPixelBootstrapSource(pixelId.trim());
    document.head.appendChild(script);
  }, [load, pixelId, pathname]);

  return null;
}
