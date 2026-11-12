"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncTikTokPixel } from "@/lib/tiktok-pixel-runtime";
import { COOKIE_CONSENT_CHANGE_EVENT } from "@/lib/cookie-consent";

/** Mount promptly; the runtime performs all consent and configuration gating. */
export function TikTokPixel() {
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => { try { syncTikTokPixel(); } catch { /* tracking must not break the storefront */ } };
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);
  return null;
}
