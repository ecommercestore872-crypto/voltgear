import type { Metadata, Viewport } from "next";
import { Fragment } from "react";
import { AppChrome } from "@/components/layout/app-chrome";
import { DemoBanner } from "@/components/demo/demo-banner";
import { DeferredUntilIdle } from "@/components/ui/deferred-until-idle";
import {
  CartDrawerClientOnly,
  CartEffectsClientOnly,
  ClarityClientOnly,
  CompareBarClientOnly,
  MetaPixelClientOnly,
  ReviewReminderClientOnly,
  ScrollToTopClientOnly,
  UrgencyTickerClientOnly,
} from "@/components/layout/storefront-client-only";
import { StorefrontAnnouncementBar } from "@/components/promotions/announcement-bar";
import { StorefrontPromoPopup } from "@/components/promotions/storefront-promo-popup";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { getPublicSocialLinks } from "@/lib/social-links-rules";
import {
  indexSiteUrl,
  organizationStructuredData,
  websiteStructuredData,
} from "@/lib/seo-rules";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { metaPixelHeadScript } from "@/lib/meta-pixel-head-script";
import { metaEnvironmentAllowed } from "@/lib/meta-commerce";
import { trackAllVisitors } from "@/lib/tracking-policy";
import { localCatalogPreviewEnabled } from "@/lib/local-catalog-preview";
import {
  loadStorefrontSettings,
  loadStorefrontShopTypes,
} from "@/lib/db/storefront-shell";
import { normalizeSettings } from "@/lib/site-config";
import { themeCssVars, themePreviewScript } from "@/lib/theme";
import "./globals.css";

const SITE_URL = indexSiteUrl();
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF6EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0E2419" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Per-page canonical = own path without query (filters/sort/page); pages may override.
  alternates: { canonical: "./" },
  title: {
    default:
      "Buy n Try — Smartwatches, Earbuds, Tripods & Chargers in Pakistan",
    template: "%s | Buy n Try",
  },
  description:
    "Explore tripods, wireless earbuds, smartwatches, power banks and chargers at Buy n Try. View product details and current listed prices.",
  keywords: [
    "Buy n Try",
    "buyntry",
    "buyntryy",
    "buy n try",
    "BNT",
    "tripods in Pakistan",
    "selfie stick Pakistan",
    "best earbuds in Pakistan",
    "airbuds in Pakistan",
    "buy airbuds online Pakistan",
    "smartwatches in Pakistan",
    "power banks Pakistan",
    "fast chargers Pakistan",
    "adapters Pakistan",
    "GaN charger Pakistan",
    "wireless microphones Pakistan",
    "ring lights Pakistan",
    "cash on delivery electronics Pakistan",
  ],
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "Buy n Try",
    title: "Buy n Try — Smartwatches, Earbuds, Tripods & Chargers in Pakistan",
    description:
      "Explore tripods, earbuds, smartwatches, chargers and adapters at Buy n Try. View product details and listed prices.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy n Try — Electronics Accessories in Pakistan",
    description:
      "Explore tripods, wireless earbuds, smartwatches, power banks, adapters and chargers at Buy n Try.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon-144.png", type: "image/png", sizes: "144x144" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/favicon-180.png", type: "image/png", sizes: "180x180" },
    ],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      "p:domain_verify": "d47f126e7e13e3bacbec1c1252d3a6da",
      ...(process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
};

export const revalidate = 300;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Avoid headers()/cookies() here — they force every page dynamic and kill CDN/ISR caching.
  const [settings, shopTypes] = await Promise.all([
    loadStorefrontSettings().catch(() => null),
    loadStorefrontShopTypes().catch(() => FALLBACK_SHOP_TYPES),
  ]);
  const config = normalizeSettings(settings);

  const brandVars = themeCssVars(settings);
  const brandName = settings?.brandName || "Buy n Try";
  let clarityHost = "";
  try {
    clarityHost = new URL(SITE_URL).host;
  } catch {
    clarityHost = "";
  }

  // Meta pixel base code goes in <head> so PageView fires before hydration.
  const metaTestMode = process.env.NEXT_PUBLIC_META_TEST_MODE === "true";
  const metaHeadScript =
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED !== "false" &&
    (process.env.NODE_ENV !== "development" || metaTestMode) &&
    metaEnvironmentAllowed({
      pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
      testMode: process.env.NEXT_PUBLIC_META_TEST_MODE,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      host: "buyntryy.com",
    })
      ? metaPixelHeadScript({ pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID!, testMode: metaTestMode, requireConsent: !trackAllVisitors() })
      : "";

  const jsonLd = [
    websiteStructuredData({
      siteUrl: SITE_URL,
      brandName,
    }),
    organizationStructuredData({
      siteUrl: SITE_URL,
      brandName,
      logo: settings?.logo || undefined,
      sameAs: getPublicSocialLinks(config).map((l) => l.href),
      phone: settings?.phone || settings?.whatsappNumber,
      email: settings?.email,
      returnDays: settings?.returnWindowDays,
    }),
  ];

  return (
    <html lang="en-PK" className={gadgetFontClass}>
      <head>
        {/* No crossOrigin: <img> fetches are anonymous no-CORS, so a CORS preconnect would not be reused. */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {brandVars && (
          <style dangerouslySetInnerHTML={{ __html: `:root{${brandVars}}` }} />
        )}
        {metaHeadScript ? (
          <script id="meta-pixel-base" dangerouslySetInnerHTML={{ __html: metaHeadScript }} />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: themePreviewScript() }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})}).catch(function(){})}",
          }}
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="flex min-h-dvh flex-col bg-background font-sans antialiased overflow-x-clip w-full relative">
        <AppChrome
          settings={settings}
          shopTypes={shopTypes}
          urgencyTicker={
            <DeferredUntilIdle key="ticker" timeoutMs={3200}>
              <UrgencyTickerClientOnly announcement={config.announcement} />
            </DeferredUntilIdle>
          }
          cartDrawer={<CartDrawerClientOnly key="cart-drawer" />}
          reviewReminder={
            <DeferredUntilIdle key="review-reminder">
              <ReviewReminderClientOnly />
            </DeferredUntilIdle>
          }
          cartEffects={<CartEffectsClientOnly key="cart-effects" />}
          compareBar={
            <DeferredUntilIdle key="compare-bar">
              <CompareBarClientOnly />
            </DeferredUntilIdle>
          }
          demoBanner={
            <Fragment key="local-preview-status">
              <DemoBanner />
              {localCatalogPreviewEnabled() ? (
                <div role="status" className="bg-[#d4b16a] px-4 py-1.5 text-center text-[11px] font-semibold text-[#173124]">
                  Local catalog snapshot from 4 Nov 2026 · illustrative campaign imagery · orders disabled
                </div>
              ) : null}
            </Fragment>
          }
        >
          <StorefrontAnnouncementBar key="announcement" tagline={settings?.tagline} />
          <DeferredUntilIdle key="promotion">
            <StorefrontPromoPopup />
          </DeferredUntilIdle>
          <DeferredUntilIdle key="scroll-top">
            <ScrollToTopClientOnly />
          </DeferredUntilIdle>
          <Fragment key="page">{children}</Fragment>
        </AppChrome>
        {/* Not deferred: it must see consent changes and route changes immediately. */}
        <MetaPixelClientOnly />
        <ClarityClientOnly projectId={CLARITY_ID} host={clarityHost} />
      </body>
    </html>
  );
}
