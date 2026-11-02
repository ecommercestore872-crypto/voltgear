"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { canSendMetaBrowserEvents, ensureMetaPageView } from "@/lib/meta-pixel-events";
import { persistMetaClick } from "@/lib/meta-click-attribution";

/** One consent-aware SDK and initialization, including StrictMode/remounts. */
export function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    const update = () => {
      if (!canSendMetaBrowserEvents()) {
        if (window.__META_PIXEL_BOOTSTRAPPED__) window.fbq?.("consent", "revoke");
        window.__META_PIXEL_LAST_PATHNAME__ = undefined;
        return;
      }
      if (!window.__META_PIXEL_BOOTSTRAPPED__) {
        const queue = function (...args: unknown[]) {
          if (queue.callMethod) queue.callMethod(...args);
          else queue.queue.push(args);
        };
        queue.queue = [] as unknown[][];
        queue.callMethod = undefined as ((...args: unknown[]) => void) | undefined;
        Object.assign(queue, { push: queue, loaded: true, version: "2.0" });
        window.fbq = window.fbq || queue;
        window._fbq = window._fbq || window.fbq;
        const id = process.env.NEXT_PUBLIC_META_PIXEL_ID!;
        window.fbq("consent", "grant");
        window.fbq("set", "autoConfig", false, id);
        window.fbq("init", id);
        window.__META_PIXEL_BOOTSTRAPPED__ = true;
        if (!document.querySelector('script[src*="connect.facebook.net"][src*="fbevents.js"]')) {
          const script = document.createElement("script");
          script.id = "meta-pixel-sdk";
          script.async = true;
          script.src = "https://connect.facebook.net/en_US/fbevents.js";
          document.head.appendChild(script);
        }
      } else window.fbq?.("consent", "grant");
      persistMetaClick();
      ensureMetaPageView(window.location.pathname);
      window.dispatchEvent(new Event("meta:pixel-ready"));
    };
    update();
    window.addEventListener("bnt-cookie-consent-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("bnt-cookie-consent-change", update);
      window.removeEventListener("storage", update);
    };
  }, [pathname]);
  return null;
}
