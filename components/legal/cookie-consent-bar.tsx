"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const COOKIE_CONSENT_STORAGE_KEY = "bnt-cookie-consent";

type Choice = "all" | "essential";

function readChoice(): Choice | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return raw === "all" || raw === "essential" ? raw : null;
}

export function CookieConsentBar() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<Choice | null | "unknown">("unknown");

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

  function save(next: Choice) {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, next);
    setChoice(next);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--g-line)] bg-[var(--g-cream)] px-4 py-3 shadow-[0_-8px_24px_rgba(31,54,38,0.12)] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--g-charcoal)]">
          We use essential cookies for your cart and checkout. Analytics and advertising cookies
          (including Google) are used only if you allow them. Details:{" "}
          <Link href="/privacy-policy" className="font-semibold text-[var(--g-forest)] underline-offset-2 hover:underline">
            Privacy
          </Link>{" "}
          and{" "}
          <Link href="/cookies" className="font-semibold text-[var(--g-forest)] underline-offset-2 hover:underline">
            Cookies
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-4 text-sm font-semibold text-[var(--g-forest)]"
            onClick={() => save("essential")}
          >
            Essential only
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--g-forest)] px-4 text-sm font-semibold text-[var(--g-white)]"
            onClick={() => save("all")}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
