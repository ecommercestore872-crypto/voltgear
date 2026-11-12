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
import { captureMetaClick } from "@/lib/meta-click-attribution";
import { CartProvider, useCart } from "@/components/cart/cart-provider";
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
const Footer = dynamic(() => import("@/components/layout/footer").then((m) => m.Footer));
const Navbar = dynamic(() => import("@/components/layout/navbar").then((m) => m.Navbar));
import { GadgetFooter } from "@/components/gadget/gadget-footer";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { GadgetNavbar } from "@/components/gadget/gadget-navbar";
import { cleanedPathnameAndSearch } from "@/lib/clean-marketing-url";
import {
  readGadgetPreviewSession,
  shouldUseGadgetChrome,
  syncGadgetPreviewSession,
} from "@/lib/gadget-preview";
import { isInvoicePath } from "@/lib/invoice-template-rules";
import type { ShopType } from "@/lib/categories";
import type { SiteSettings } from "@/lib/types";

function CartDrawerGate({ children }: { children: ReactNode }) {
  const { isOpen } = useCart();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 4500 });
      return () => win.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 2200);
    return () => window.clearTimeout(id);
  }, []);

  return ready || isOpen ? <>{children}</> : null;
}

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
      captureMetaClick(`${window.location.pathname}${currentSearch}`);
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

  const activePath = pathname || "/";
  const pageNodes = Children.toArray(children);

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
        {!pathname?.startsWith("/admin") ? (
          <TikTokPixel />
        ) : null}
        {gadget ? (
          <>
            <div
              className={`gadget-theme flex min-h-dvh flex-col overflow-x-clip ${gadgetFontClass}`}
            >
              {demoBanner}
              <GadgetNavbar settings={settings} shopTypes={shopTypes} />
              <main className="min-w-0 flex-1 bg-[var(--g-cream)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
                {pageNodes}
              </main>
              <GadgetFooter settings={settings} shopTypes={shopTypes} />
              <CartDrawerGate>{cartDrawer}</CartDrawerGate>
              {cartEffects}
              <DeferredUntilIdle timeoutMs={3500}>
                <CookieConsentBar />
              </DeferredUntilIdle>
            </div>
            <DeferredUntilIdle>
              <ShopWhatsAppButton settings={settings} />
            </DeferredUntilIdle>
          </>
        ) : (
          <>
            {urgencyTicker}
            {demoBanner}
            <Navbar settings={settings} shopTypes={shopTypes} />
            <main className="flex-1 overflow-x-hidden w-full">{pageNodes}</main>
            <Footer settings={settings} shopTypes={shopTypes} />
            <DeferredUntilIdle>
              <ShopWhatsAppButton settings={settings} />
            </DeferredUntilIdle>
            <CartDrawerGate>{cartDrawer}</CartDrawerGate>
            {reviewReminder}
            {cartEffects}
            {compareBar}
            <DeferredUntilIdle timeoutMs={3500}>
              <CookieConsentBar />
            </DeferredUntilIdle>
          </>
        )}
      </WishlistProvider>
    </CartProvider>
  );
}
