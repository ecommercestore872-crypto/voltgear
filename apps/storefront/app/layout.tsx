import type { Metadata, Viewport } from "next";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import { AppChrome } from "@/components/layout/app-chrome";
import { DemoBanner } from "@/components/demo/demo-banner";
import { GadgetFooter } from "@/components/gadget/gadget-footer";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { SHOPPER_BRAND } from "@/lib/brand";
import {
  indexSiteUrl,
  organizationStructuredData,
  websiteStructuredData,
} from "@/lib/seo-rules";
import {
  BUY_N_TRY_ADSENSE_PUB_ID,
  adsenseHeadScriptSrc,
} from "@/lib/adsense-policy";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  loadStorefrontSettings,
  loadStorefrontShopTypes,
} from "@/lib/db/storefront-shell";
import type { SiteSettings } from "@/lib/types";
import "./globals.css";

import { StorefrontAnnouncementBar } from "@/components/promotions/announcement-bar";

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
  title: {
    default:
      "Buy n Try — Smartwatches, Earbuds, Tripods & Chargers in Pakistan",
    template: "%s | Buy n Try",
  },
  description:
    "Buy tripods, wireless earbuds, smartwatches, power banks and chargers at Buy n Try. Cash on delivery in serviceable areas.",
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
      "Buy tripods, earbuds, smartwatches, chargers and adapters. Cash on delivery in serviceable areas. buyntryy.com",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy n Try — Electronics Accessories in Pakistan",
    description:
      "Buy authentic tripods, wireless earbuds, smartwatches, power banks, adapters & fast chargers in Pakistan.",
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
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
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
  other: {
    "google-adsense-account": BUY_N_TRY_ADSENSE_PUB_ID,
  },
};

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

const ADSENSE_SCRIPT_SRC = adsenseHeadScriptSrc(
  process.env.NEXT_PUBLIC_ADSENSE_PUB_ID,
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Avoid headers()/cookies() here — they force every page dynamic and kill CDN/ISR caching.
  const settings: SiteSettings | null = await loadStorefrontSettings().catch(
    () => null,
  );
  const shopTypes = await loadStorefrontShopTypes().catch(
    () => FALLBACK_SHOP_TYPES,
  );

  const brandName = settings?.brandName || "Buy n Try";
  let clarityHost = "";
  try {
    clarityHost = new URL(SITE_URL).host;
  } catch {
    clarityHost = "";
  }

  const jsonLd = [
    websiteStructuredData({
      siteUrl: SITE_URL,
      brandName,
    }),
    organizationStructuredData({
      siteUrl: SITE_URL,
      brandName,
      logo: settings?.logo
        ? `${SITE_URL}/api/logo`
        : `${SITE_URL}${SHOPPER_BRAND.sealSrc}`,
      phone: settings?.phone || settings?.whatsappNumber,
      email: settings?.email,
      returnDays: settings?.returnWindowDays,
    }),
  ];

  const chromeSettings: SiteSettings | null = settings
    ? {
        ...settings,
        lifestyleShop: undefined,
        homeSections: undefined,
        invoiceTemplate: undefined,
        orderEmails: undefined,
        emailSenders: undefined,
        announcement: undefined,
        seo: undefined,
        draft: undefined,
      }
    : null;

  return (
    <html lang="en-PK" className={gadgetFontClass}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://zeuhfqevqjkbzwdaxjuv.supabase.co" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-dvh bg-background font-sans antialiased overflow-x-hidden w-full relative">
        <AppChrome
          settings={chromeSettings}
          shopTypes={shopTypes}
          gadgetFooter={
            <GadgetFooter settings={chromeSettings} shopTypes={shopTypes} />
          }
          demoBanner={<DemoBanner />}
          clarityId={CLARITY_ID}
          clarityHost={clarityHost}
          adsenseSrc={ADSENSE_SCRIPT_SRC}
        >
          <StorefrontAnnouncementBar tagline={settings?.tagline} />
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
