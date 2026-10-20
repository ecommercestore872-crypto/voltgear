"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentChoice,
} from "@/components/legal/cookie-consent-bar";
import { ensureMetaPageView } from "@/lib/meta-pixel-events";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    setConsent(stored === "all" || stored === "essential" ? stored : null);

    function onConsent(event: Event) {
      const choice = (event as CustomEvent<CookieConsentChoice>).detail;
      setConsent(choice === "all" || choice === "essential" ? choice : null);
    }

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!META_PIXEL_ID || consent !== "all") return;
    ensureMetaPageView(pathname);
  }, [consent, pathname]);

  if (!META_PIXEL_ID || consent !== "all") return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="lazyOnload"
      >
        {`
          if (!window.__META_PIXEL_BOOTSTRAPPED__) {
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
            
            window.__META_PIXEL_LAST_PATHNAME__ = window.location.pathname;
            window.__META_PAGEVIEW_SEQUENCE__ = 1;
            window.__META_PIXEL_BOOTSTRAPPED__ = true;
            
            window.dispatchEvent(new Event('meta:pixel-ready'));
          }
        `}
      </Script>
    </>
  );
}
