"use client";

import { useEffect, useState } from "react";

import { COOKIE_CONSENT_CHANGE_EVENT, COOKIE_CONSENT_STORAGE_KEY, allowsAnalytics, parseCookieConsent, readCookieConsent, type CookieConsentChoice } from "@/lib/cookie-consent";
import { shouldLoadClarity } from "@/lib/clarity-rules";

function readConsent(): CookieConsentChoice | null {
  return readCookieConsent();
}

/** Loads Microsoft Clarity after idle — session replay for checkout/PDP funnels. */
export function ClarityDeferred({
  projectId,
  host,
}: {
  projectId?: string | null;
  host: string;
}) {
  const [consent, setConsent] = useState<CookieConsentChoice | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    function onConsent(event: Event) {
      const choice = (event as CustomEvent<CookieConsentChoice>).detail;
      setConsent(
        parseCookieConsent(choice) ?? readConsent(),
      );
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
    if (!allowsAnalytics(consent)) return;
    if (
      !shouldLoadClarity({
        id: projectId,
        isAdmin: false,
        host,
      })
    ) {
      return;
    }
    const id = projectId!.trim();

    function inject() {
      if (document.querySelector(`script[data-clarity="${id}"]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.clarity.ms/tag/${id}`;
      s.dataset.clarity = id;
      document.head.appendChild(s);
    }

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

    function scheduleInject() {
      const run = () => {
        timeoutId = globalThis.setTimeout(inject, 800);
      };
      if ("requestIdleCallback" in window) {
        idleId = (
          window as Window & {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
          }
        ).requestIdleCallback(run, { timeout: 6000 });
      } else {
        timeoutId = globalThis.setTimeout(run, 4000);
      }
    }

    if (document.readyState === "complete") {
      scheduleInject();
    } else {
      window.addEventListener("load", scheduleInject, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleInject);
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        (
          window as Window & { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback(idleId);
      }
    };
  }, [consent, projectId, host]);

  return null;
}
