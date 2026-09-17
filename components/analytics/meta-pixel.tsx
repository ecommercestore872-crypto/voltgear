"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ensureMetaPageView } from "@/lib/meta-pixel-events";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    ensureMetaPageView(pathname);
  }, [pathname]);

  if (!META_PIXEL_ID) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
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
