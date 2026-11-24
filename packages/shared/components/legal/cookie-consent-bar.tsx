"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Notice, not a choice. Measurement (Meta, TikTok, Microsoft Clarity and order
 * attribution) runs for every visitor (see lib/tracking-policy.ts), so this bar
 * offers no accept/reject buttons that would not change anything. It only tells
 * visitors what happens and links to the policies. Dismissing it is remembered.
 */
const NOTICE_KEY = "bnt-tracking-notice-v1";

export function CookieConsentBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setOpen(!window.localStorage.getItem(NOTICE_KEY)); } catch { setOpen(true); }
  }, []);

  if (!open || pathname?.startsWith("/admin") || pathname?.startsWith("/studio")) return null;

  function dismiss() {
    try { window.localStorage.setItem(NOTICE_KEY, "1"); } catch {}
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-description"
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[100] mx-auto max-w-sm rounded-xl border border-border bg-background p-3 text-foreground shadow-lg sm:inset-x-auto sm:bottom-5 sm:left-5 sm:mx-0 sm:w-[360px] sm:p-4"
    >
      <h2 id="cookie-notice-title" className="text-sm font-bold">How this shop measures visits</h2>
      <p id="cookie-notice-description" className="mt-1 text-xs leading-snug text-muted-foreground">
        We use cookies and similar tools, including Meta and TikTok pixels and Microsoft Clarity, to keep the shop working, count visits and orders, and measure our ads. These are always on while you use the shop.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        OK
      </button>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        Read our <Link href="/privacy-policy" className="underline">Privacy Policy</Link> and <Link href="/cookies" className="underline">Cookie Policy</Link>.
      </p>
    </div>
  );
}
