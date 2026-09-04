"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

import { BntSeal } from "@/components/brand/bnt-seal";
import { SHOPPER_BRAND } from "@/lib/brand";
import {
  WELCOME_POPUP_DELAY_MS,
  WELCOME_POPUP_STORAGE_KEY,
  welcomePopupStillHidden,
} from "@/lib/welcome-coupon-rules";

export function PromoPopupModal({
  code,
  minOrderLabel = "Rs. 3,000",
}: {
  code?: string | null;
  minOrderLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!code) return;
    const seen = window.localStorage.getItem(WELCOME_POPUP_STORAGE_KEY);
    if (welcomePopupStillHidden(seen)) return;
    const timer = window.setTimeout(() => setIsOpen(true), WELCOME_POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  function handleClose() {
    window.localStorage.setItem(
      WELCOME_POPUP_STORAGE_KEY,
      new Date().toISOString()
    );
    setIsOpen(false);
  }

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      handleClose();
    }, 1200);
  }

  if (!code || !isOpen) return null;

  return (
    <div
      className="gadget-theme fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--g-forest)]/45"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-coupon-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-cream)] p-6 text-[var(--g-charcoal)] shadow-[0_16px_40px_rgba(31,54,38,0.12)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[var(--g-taupe)] transition hover:bg-[var(--g-cream-deep)] hover:text-[var(--g-charcoal)]"
          aria-label="Close welcome offer"
        >
          <X className="h-4 w-4 stroke-[1.75]" />
        </button>

        <div className="text-center">
          <BntSeal className="mx-auto" />
          <h2
            id="welcome-coupon-title"
            className="gadget-display mt-4 text-2xl font-semibold tracking-[-0.02em]"
          >
            {SHOPPER_BRAND.tagline}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--g-taupe)]">
            10% off your first order over {minOrderLabel}.
          </p>
        </div>

        <div className="gadget-ticket-well mt-6 flex items-center justify-between rounded-xl px-4 py-3">
          <div className="text-left">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--g-taupe)]">
              Code
            </div>
            <div className="font-mono text-lg font-bold tracking-[0.12em] text-[var(--g-forest)]">
              {code}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--g-forest)] px-4 py-2.5 text-xs font-semibold text-[var(--g-cream)] transition hover:bg-[var(--g-forest-mid)]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="mt-4 block w-full text-center text-sm font-medium text-[var(--g-taupe)] underline-offset-4 hover:text-[var(--g-charcoal)] hover:underline"
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}
