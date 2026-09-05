"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { COOKIE_CONSENT_STORAGE_KEY } from "@/components/legal/cookie-consent-bar";
import { allowsAdsenseDisplayAds } from "@/lib/adsense-placement";
import { resolveAdsensePublisherId } from "@/lib/adsense-policy";

interface AdSenseUnitProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  responsive?: boolean;
  className?: string;
}

export function AdSenseUnit({
  slot,
  format = "auto",
  responsive = true,
  className = "",
}: AdSenseUnitProps) {
  const ids = resolveAdsensePublisherId(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);
  const pathname = usePathname() || "";
  const pushed = useRef(false);
  const [adsAllowed, setAdsAllowed] = useState(false);

  useEffect(() => {
    setAdsAllowed(
      window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === "all"
    );
  }, [pathname]);

  useEffect(() => {
    if (
      !slot ||
      !adsAllowed ||
      !allowsAdsenseDisplayAds(pathname) ||
      pushed.current
    ) {
      return;
    }
    try {
      // @ts-expect-error adsbygoogle is injected by Google's script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.warn("AdSense push error:", err);
    }
  }, [adsAllowed, pathname, slot]);

  if (!slot || !adsAllowed || !allowsAdsenseDisplayAds(pathname)) return null;

  return (
    <aside
      className={`mt-10 overflow-hidden border-t border-[var(--g-line)] pt-8 text-center ${className}`}
      aria-label="Advertisement"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-taupe)]">
        Advertisement
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ids.scriptClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </aside>
  );
}
