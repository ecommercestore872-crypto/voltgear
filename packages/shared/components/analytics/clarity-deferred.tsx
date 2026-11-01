"use client";

import { useEffect, useState } from "react";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentChoice,
} from "@/components/legal/cookie-consent-bar";
import { shouldLoadClarity } from "@/lib/clarity-rules";

function readConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return value === "all" || value === "essential" ? value : null;
  } catch { return null; }
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
        choice === "all" || choice === "essential" ? choice : readConsent(),
      );
    }
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
    return () =>
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (consent !== "all") return;
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
