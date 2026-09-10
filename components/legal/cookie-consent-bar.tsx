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
      className="fixed inset-x-0 bottom-0 z-[100] sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="flex flex-col gap-4 sm:gap-5 overflow-hidden rounded-t-[1.5rem] sm:rounded-[1.25rem] border-t-2 sm:border-2 border-t-[var(--g-forest)] sm:border-[var(--g-forest)] bg-[var(--g-white)]/95 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:shadow-[0_24px_50px_rgba(0,0,0,0.30)] backdrop-blur-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6" style={{ WebkitBackdropFilter: 'blur(24px)' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)] text-white">
              <Cookie className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h3 className="text-[0.9rem] sm:text-[0.95rem] font-black tracking-tight text-[var(--g-charcoal)]">
              We value your privacy
            </h3>
          </div>
          <p className="text-xs sm:text-[0.8rem] leading-relaxed text-[var(--g-taupe)]">
            We use cookies to personalize content and ads, provide social media features, and analyze traffic to improve your experience. Read our{" "}
            <Link
              href="/privacy-policy"
              className="font-semibold text-[var(--g-forest)] underline underline-offset-[3px] decoration-1 transition-colors hover:text-[var(--g-charcoal)]"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/cookies"
              className="font-semibold text-[var(--g-forest)] underline underline-offset-[3px] decoration-1 transition-colors hover:text-[var(--g-charcoal)]"
            >
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            className="inline-flex min-h-[2.5rem] sm:min-h-[2.75rem] items-center justify-center rounded-xl bg-[var(--g-forest)] px-4 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:scale-[1.02] hover:bg-black"
            onClick={() => save("all")}
          >
            Accept All
          </button>
          <button
            type="button"
            className="inline-flex min-h-[2.5rem] sm:min-h-[2.75rem] items-center justify-center rounded-xl border border-[var(--g-line)] bg-transparent px-4 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--g-charcoal)] transition-all hover:scale-[1.02] hover:bg-black/5"
            onClick={() => save("essential")}
          >
            Essentials
          </button>
        </div>
      </div>
    </div>
  );
}
