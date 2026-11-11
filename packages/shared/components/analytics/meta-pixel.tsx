"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureMetaPageView } from "@/lib/meta-pixel-events";
import { canSendMetaBrowserEvent } from "@/lib/meta-consent";
import { readStoredClickAttribution, writeMetaFbcCookie } from "@/lib/click-attribution";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const refresh = () => setAllowed(canSendMetaBrowserEvent());
    refresh();
    window.addEventListener("bnt-cookie-consent-change", refresh);
    return () => window.removeEventListener("bnt-cookie-consent-change", refresh);
  }, []);

  useEffect(() => {
    if (!META_PIXEL_ID || !allowed) {
      if (window.fbq) window.fbq("consent", "revoke");
      window.__META_PIXEL_LAST_PATHNAME__ = undefined;
      return;
    }
    writeMetaFbcCookie(readStoredClickAttribution()?.fbclid);
    window.fbq?.("consent", "grant");
    ensureMetaPageView(pathname);
  }, [pathname, allowed]);

  if (!META_PIXEL_ID || !allowed) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="lazyOnload"
        onReady={() => { ensureMetaPageView(window.location.pathname); }}
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
            window.__META_PIXEL_BOOTSTRAPPED__ = true;
            
            window.dispatchEvent(new Event('meta:pixel-ready'));
          }
        `}
      </Script>
    </>
  );
}
