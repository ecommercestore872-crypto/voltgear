"use client";

import type { ReactNode } from "react";
import { Children, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import dynamic from "next/dynamic";

const TikTokPixel = dynamic(
  () =>
    import("@/components/analytics/tiktok-pixel").then((m) => m.TikTokPixel),
  { ssr: false, loading: () => null },
);
const MetaPixel = dynamic(
  () =>
    import("@/components/analytics/meta-pixel").then((m) => m.MetaPixel),
  { ssr: false, loading: () => null },
);
const ClarityDeferred = dynamic(
  () =>
    import("@/components/analytics/clarity-deferred").then(
      (m) => m.ClarityDeferred,
    ),
  { ssr: false, loading: () => null },
);
const ScrollToTopButton = dynamic(
  () =>
    import("@/components/ui/scroll-to-top-button").then(
      (m) => m.ScrollToTopButton,
    ),
  { ssr: false, loading: () => null },
);
const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false, loading: () => null },
);
const CartEffects = dynamic(
  () => import("@/components/effects/cart-effects").then((m) => m.CartEffects),
  { ssr: false, loading: () => null },
);
const StorefrontPromoPopup = dynamic(
  () =>
    import("@/components/promotions/storefront-promo-popup").then(
      (m) => m.StorefrontPromoPopup,
    ),
  { ssr: false, loading: () => null },
);
import { captureClickAttribution, persistClickAttribution } from "@/lib/click-attribution";
import { CartProvider } from "@/components/cart/cart-provider";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
const CookieConsentBar = dynamic(
  () =>
    import("@/components/legal/cookie-consent-bar").then(
      (m) => m.CookieConsentBar,
    ),
  { ssr: false, loading: () => null },
);

const ShopWhatsAppButton = dynamic(
  () =>
    import("@/components/shop/shop-whatsapp-button").then(
      (m) => m.ShopWhatsAppButton,
    ),
  { ssr: false, loading: () => null },
);
import { DeferredUntilIdle } from "@/components/ui/deferred-until-idle";
const Footer = dynamic(
  () => import("@/components/layout/footer").then((m) => m.Footer),
  { ssr: false, loading: () => null },
);
const Navbar = dynamic(
  () => import("@/components/layout/navbar").then((m) => m.Navbar),
  { ssr: false, loading: () => null },
);
const GadgetFooterFallback = dynamic(
  () =>
    import("@/components/gadget/gadget-footer").then((m) => m.GadgetFooter),
  { ssr: true },
);
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { GadgetNavbar } from "@/components/gadget/gadget-navbar";
import { cleanedPathnameAndSearch } from "@/lib/clean-marketing-url";
import {
  isCheckoutPath,
  readGadgetPreviewSession,
  shouldUseGadgetChrome,
  syncGadgetPreviewSession,
} from "@/lib/gadget-preview";
import { isInvoicePath } from "@/lib/invoice-template-rules";
import type { ShopType } from "@/lib/categories";
import type { SiteSettings } from "@/lib/types";

export function AppChrome({
  children,
  settings,
  shopTypes,
  gadgetFooter,
  cartDrawer,
  reviewReminder,
  cartEffects,
  urgencyTicker,
  compareBar,
  demoBanner,
  clarityId,
  clarityHost,
  adsenseSrc,
}: {
  children: ReactNode;
  settings: SiteSettings | null;
  shopTypes: ShopType[];
  gadgetFooter?: ReactNode;
  cartDrawer?: ReactNode;
  reviewReminder?: ReactNode;
  cartEffects?: ReactNode;
  urgencyTicker?: ReactNode;
  compareBar?: ReactNode;
  demoBanner?: ReactNode;
  clarityId?: string;
  clarityHost?: string;
  adsenseSrc?: string;
}) {
  const pathname = usePathname();
  const [sessionActive, setSessionActive] = useState(false);
  const [checkoutFromGadget, setCheckoutFromGadget] = useState(false);

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;

    const currentSearch = window.location.search;
    persistClickAttribution(captureClickAttribution(window.location.href));
    const params = new URLSearchParams(
      currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
    );
    const isFromGadget = params.get("from") === "gadget";

    if (isCheckoutPath(pathname)) {
      syncGadgetPreviewSession(pathname, params.toString());
      const isSessionActive = Boolean(readGadgetPreviewSession() || isFromGadget);
      setCheckoutFromGadget((prev) => (prev !== isFromGadget ? isFromGadget : prev));
      setSessionActive((prev) => (prev !== isSessionActive ? isSessionActive : prev));
    }

    const runIdle = () => {
      try {
        const p = params.get("theme");
        let s: string | null = null;
        try {
          s = localStorage.getItem("voltage-theme");
        } catch {
          // ignore
        }
        const t =
          p === "dark" || p === "light"
            ? p
            : s === "dark" || s === "light"
              ? s
              : null;
        if (t === "dark") document.documentElement.classList.add("dark");
        else if (t === "light") document.documentElement.classList.remove("dark");
      } catch {
        // ignore
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
      if (!isCheckoutPath(pathname)) {
        syncGadgetPreviewSession(pathname, params.toString());
      }
      const cleaned = cleanedPathnameAndSearch(
        window.location.pathname,
        currentSearch,
      );
      const current = `${window.location.pathname}${currentSearch}`;
      if (cleaned !== current) {
        window.history.replaceState(window.history.state, "", cleaned);
      }
    };

    const timer = setTimeout(runIdle, 6500);
    return () => clearTimeout(timer);
  }, [pathname]);

  const activePath = pathname || "/";

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (isInvoicePath(activePath)) {
    const nodes = Children.toArray(children);
    return <>{nodes.at(-1) ?? children}</>;
  }

  const gadget = shouldUseGadgetChrome(activePath, {
    search: checkoutFromGadget ? "from=gadget" : "",
    sessionActive: sessionActive || checkoutFromGadget,
  });
  return (
    <CartProvider>
      <WishlistProvider>
        {gadget ? (
          <div
            className={`gadget-theme flex min-h-dvh flex-col overflow-x-clip ${gadgetFontClass}`}
          >
            {demoBanner}
            <GadgetNavbar settings={settings} shopTypes={shopTypes} />
            <main className="min-w-0 flex-1 bg-[var(--g-cream)]">
              {children}
            </main>
            {gadgetFooter ?? (
              <GadgetFooterFallback settings={settings} shopTypes={shopTypes} />
            )}
            {cartDrawer}
            {cartEffects}
          </div>
        ) : (
          <>
            {urgencyTicker}
            {demoBanner}
            <Navbar settings={settings} shopTypes={shopTypes} />
            <main className="flex-1 overflow-x-hidden w-full">{children}</main>
            <Footer settings={settings} shopTypes={shopTypes} />
            {cartDrawer}
            {reviewReminder}
            {cartEffects}
            {compareBar}
          </>
        )}
        <DeferredUntilIdle>
          {!pathname?.startsWith("/admin") ? <TikTokPixel /> : null}
          {!cartDrawer ? <CartDrawer /> : null}
          {!cartEffects ? <CartEffects /> : null}
          <StorefrontPromoPopup />
          <ScrollToTopButton />
          <CookieConsentBar />
          <ShopWhatsAppButton settings={settings} />
          <MetaPixel />
          <ClarityDeferred projectId={clarityId} host={clarityHost || ""} />
          {adsenseSrc ? (
            <script src={adsenseSrc} async crossOrigin="anonymous" />
          ) : null}
        </DeferredUntilIdle>
      </WishlistProvider>
    </CartProvider>
  );
}
