"use client";

import { useEffect, useRef, useState } from "react";

import { WhatsAppIcon } from "@/components/icons/social-icons";
import { shopWhatsAppHref } from "@/lib/contact-links";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/types";

export function ShopWhatsAppButton({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  const href = shopWhatsAppHref(settings);
  const [expanded, setExpanded] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!href) return;
    const openTimer = window.setTimeout(() => setExpanded(true), 1400);
    const closeTimer = window.setTimeout(() => {
      setExpanded((open) => (pinnedOpen ? open : false));
    }, 5200);
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [href, pinnedOpen]);

  useEffect(() => {
    if (!href) return;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current + 12 && y > 80) {
        if (!pinnedOpen) setExpanded(false);
      } else if (y < lastScrollY.current - 12) {
        setExpanded(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [href, pinnedOpen]);

  if (!href) return null;

  const showLabel = expanded || pinnedOpen;

  return (
    <div className="pointer-events-none fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-[9999] sm:bottom-6 sm:right-6 transform-gpu">
      <div className="relative inline-flex items-center justify-end">
        <span
          className={cn(
            "shop-wa-pulse pointer-events-none absolute right-0 top-1/2 z-0 h-14 w-14 -translate-y-1/2 rounded-full",
            showLabel && "opacity-40",
          )}
          aria-hidden
        />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with Buy n Try on WhatsApp — order help, COD"
          onMouseEnter={() => {
            setPinnedOpen(true);
            setExpanded(true);
          }}
          onMouseLeave={() => setPinnedOpen(false)}
          onFocus={() => {
            setPinnedOpen(true);
            setExpanded(true);
          }}
          onBlur={() => setPinnedOpen(false)}
          className={cn(
            "shop-wa-launcher pointer-events-auto relative z-[1] inline-flex h-14 items-center rounded-full bg-[#25D366] text-white",
            "shadow-[0_10px_28px_rgba(37,211,102,0.38)] transition-[width,background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:bg-[#20bd5a] hover:shadow-[0_14px_32px_rgba(37,211,102,0.45)] hover:-translate-y-0.5",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--g-forest,#1b3d29)]",
            showLabel ? "w-[min(100vw-2.5rem,15.75rem)]" : "w-14",
          )}
        >
          {/* Fixed 56×56 icon cell — keeps the glyph perfectly centered when collapsed */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center">
            <WhatsAppIcon className="block h-[1.65rem] w-[1.65rem] shrink-0" />
          </span>
          <span
            className={cn(
              "flex min-w-0 flex-col justify-center overflow-hidden pr-5 transition-[opacity,max-width,margin] duration-300",
              showLabel
                ? "ml-0 max-w-[10.5rem] opacity-100"
                : "ml-0 max-w-0 pr-0 opacity-0",
            )}
            aria-hidden={!showLabel}
          >
            <span className="truncate whitespace-nowrap text-[13px] font-bold leading-tight tracking-tight">
              Chat with us
            </span>
            <span className="truncate whitespace-nowrap text-[10px] font-medium leading-tight text-white/90">
              Order help · COD
            </span>
          </span>
        </a>
      </div>
    </div>
  );
}
