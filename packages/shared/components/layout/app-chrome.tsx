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
import { captureClickAttribution, persistClickAttribution } from "@/lib/click-attribution";
import { CartProvider } from "@/components/cart/cart-provider";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { CookieConsentBar } from "@/components/legal/cookie-consent-bar";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { GadgetFooter } from "@/components/gadget/gadget-footer";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { GadgetNavbar } from "@/components/gadget/gadget-navbar";
import { ShopWhatsAppButton } from "@/components/shop/shop-whatsapp-button";
import { TrustBar } from "@/components/sections/trust-bar";
import { cleanedPathnameAndSearch } from "@/lib/clean-marketing-url";
import {
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
  cartDrawer,
  reviewReminder,
  cartEffects,
  urgencyTicker,
  compareBar,
  demoBanner,
}: {
  children: ReactNode;
  settings: SiteSettings | null;
  shopTypes: ShopType[];
  cartDrawer: ReactNode;
  reviewReminder: ReactNode;
  cartEffects: ReactNode;
  urgencyTicker: ReactNode;
  compareBar: ReactNode;
  demoBanner: ReactNode;
}) {
  const pathname = usePathname();
  const [sessionActive, setSessionActive] = useState(false);
  const [checkoutFromGadget, setCheckoutFromGadget] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(
      currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
    );
    syncGadgetPreviewSession(pathname, params.toString());
    setCheckoutFromGadget(params.get("from") === "gadget");
    setSessionActive(
      readGadgetPreviewSession() || params.get("from") === "gadget",
    );
    if (typeof window !== "undefined") {
      persistClickAttribution(
        captureClickAttribution(
          `${window.location.pathname}${currentSearch}`,
        ),
      );
      const cleaned = cleanedPathnameAndSearch(
        window.location.pathname,
        currentSearch,
      );
      const current = `${window.location.pathname}${currentSearch}`;
      if (cleaned !== current) {
        window.history.replaceState(window.history.state, "", cleaned);
      }
    }
  }, [pathname]);

  if (!pathname) {
    return (
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    );
  }

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (isInvoicePath(pathname)) {
    const nodes = Children.toArray(children);
    return <>{nodes.at(-1) ?? children}</>;
  }

  const gadget = shouldUseGadgetChrome(pathname, {
    search: checkoutFromGadget ? "from=gadget" : "",
    sessionActive: sessionActive || checkoutFromGadget,
  });

  return (
    <CartProvider>
      <WishlistProvider>
        {!pathname.startsWith("/admin") ? <TikTokPixel /> : null}
        {gadget ? (
          <>
            <div
              className={`gadget-theme flex min-h-dvh flex-col overflow-x-clip ${gadgetFontClass}`}
            >
              {demoBanner}
              <GadgetNavbar settings={settings} shopTypes={shopTypes} />
              <main className="min-w-0 flex-1 bg-[var(--g-cream)]">
                {children}
              </main>
              <GadgetFooter settings={settings} shopTypes={shopTypes} />
              {cartDrawer}
              {cartEffects}
              <CookieConsentBar />
            </div>
            <ShopWhatsAppButton settings={settings} />
          </>
        ) : (
          <>
            {urgencyTicker}
            {demoBanner}
            <Navbar settings={settings} shopTypes={shopTypes} />
            <main className="flex-1 overflow-x-hidden w-full">{children}</main>
            <Footer settings={settings} shopTypes={shopTypes} />
            <ShopWhatsAppButton settings={settings} />
            {cartDrawer}
            {reviewReminder}
            {cartEffects}
            {compareBar}
            <CookieConsentBar />
          </>
        )}
      </WishlistProvider>
    </CartProvider>
  );
}
