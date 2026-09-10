"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Cookie } from "lucide-react";

export const COOKIE_CONSENT_STORAGE_KEY = "bnt-cookie-consent";
export const COOKIE_CONSENT_CHANGE_EVENT = "bnt-cookie-consent-change";
export type CookieConsentChoice = "all" | "essential";

function readChoice(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return raw === "all" || raw === "essential" ? raw : null;
}

export function CookieConsentBar() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<CookieConsentChoice | null | "unknown">(
    "unknown",
  );

  useEffect(() => {
    setChoice(readChoice());
  }, []);

  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/studio") ||
    pathname?.startsWith("/checkout")
  ) {
    return null;
  }
  if (choice === "unknown" || choice) return null;

  function save(next: CookieConsentChoice) {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, next);
    setChoice(next);
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, { detail: next }),
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 z-[100] sm:left-6 sm:bottom-6 sm:max-w-[340px] animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="flex flex-col gap-3 sm:gap-4 overflow-hidden rounded-[1.25rem] border border-primary bg-background/95 shadow-2xl backdrop-blur-2xl p-4 sm:p-5" style={{ WebkitBackdropFilter: 'blur(24px)' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Cookie className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black tracking-tight text-foreground">
              We value your privacy
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">
            We use cookies to personalize content and ads, provide social media features, and analyze traffic to improve your experience. Read our{" "}
            <Link
              href="/privacy-policy"
              className="font-semibold text-primary underline underline-offset-[3px] decoration-1 transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/cookies"
              className="font-semibold text-primary underline underline-offset-[3px] decoration-1 transition-colors hover:text-foreground"
            >
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex min-h-[2.25rem] items-center justify-center rounded-lg bg-primary px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-primary/90"
            onClick={() => save("all")}
          >
            Accept All
          </button>
          <button
            type="button"
            className="inline-flex min-h-[2.25rem] items-center justify-center rounded-lg border border-border bg-transparent px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-foreground transition-all hover:scale-[1.02] hover:bg-muted"
            onClick={() => save("essential")}
          >
            Essentials
          </button>
        </div>
      </div>
    </div>
  );
}
