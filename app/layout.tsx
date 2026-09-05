import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { Suspense } from "react";

import { AppChrome } from "@/components/layout/app-chrome";
import { DemoBanner } from "@/components/demo/demo-banner";
import { shouldLoadClarity } from "@/lib/clarity-rules";
import { SHOPPER_BRAND } from "@/lib/brand";
import { indexSiteUrl, organizationStructuredData } from "@/lib/seo-rules";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchShopTypes } from "@/lib/db/store";
import { getSettings, resolveFonts } from "@/lib/sanity/settings";
import { pathnameFromHeaders } from "@/lib/storefront-layout-rules";
import { normalizeSettings } from "@/lib/site-config";
import { themeCssVars, themePreviewScript } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/types";
import "./globals.css";

import { StorefrontAnnouncementBar } from "@/components/promotions/announcement-bar";
import { StorefrontPromoPopup } from "@/components/promotions/storefront-promo-popup";

const CartDrawer = dynamic(
  () =>
    import("@/components/cart/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false, loading: () => null }
);

const ReviewReminderPopup = dynamic(
  () =>
    import("@/components/reviews/review-reminder-popup").then(
      (m) => m.ReviewReminderPopup
    ),
  { ssr: false, loading: () => null }
);

const CartEffects = dynamic(
  () => import("@/components/effects/cart-effects").then((m) => m.CartEffects),
  { ssr: false, loading: () => null }
);

const UrgencyTicker = dynamic(
  () =>
    import("@/components/sections/urgency-ticker").then((m) => m.UrgencyTicker),
  { ssr: false, loading: () => null }
);

const CompareBarWrapper = dynamic(
  () =>
    import("@/components/product/compare-bar-wrapper").then(
      (m) => m.CompareBarWrapper
    ),
  { ssr: false, loading: () => null }
);

const SITE_URL = indexSiteUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#1F3626" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Buy n Try — Smartwatches, Earbuds, Tripods & Chargers in Pakistan",
    template: "%s | Buy n Try",
  },
  description:
    "Buy authentic tripods, wireless earbuds, smartwatches, power banks and chargers at Buy n Try. Try it at home — cash on delivery nationwide.",
  keywords: [
    "tripods in Pakistan",
    "best earbuds in Pakistan",
    "airbuds in Pakistan",
    "buy airbuds online Pakistan",
    "smartwatches in Pakistan",
    "power banks Pakistan",
    "fast chargers Pakistan",
    "wireless microphones Pakistan",
    "ring lights Pakistan",
    "Buy n Try",
    "buyntryy",
  ],
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "Buy n Try",
    title: "Buy n Try — Smartwatches, Earbuds, Tripods & Chargers in Pakistan",
    description:
      "Buy authentic tripods, earbuds, smartwatches and chargers. Try it at home — cash on delivery nationwide.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy n Try — Electronics Accessories in Pakistan",
    description:
      "Buy authentic tripods in Pakistan, wireless earbuds, smartwatches, power banks & fast chargers.",
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
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=bnt", type: "image/x-icon", sizes: "any" },
      { url: "/favicon-32.png?v=bnt", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png?v=bnt", type: "image/png", sizes: "16x16" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico?v=bnt",
    apple: "/apple-icon.png",
  },
};

export const revalidate = 60;

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = headers();
  const pathname = pathnameFromHeaders({
    "x-pathname": hdrs.get("x-pathname"),
    "next-url": hdrs.get("next-url"),
  });
  const skipStorefrontFetch = pathname.startsWith("/admin");

  const settings: SiteSettings | null = skipStorefrontFetch
    ? null
    : await getSettings().catch(() => null);
  const shopTypes = skipStorefrontFetch
    ? FALLBACK_SHOP_TYPES
    : await fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES);
  const config = normalizeSettings(settings);

  if (settings?.seo?.title) {
    metadata.title = {
      default: settings.seo.title,
      template: `%s | ${settings.brandName}`,
    };
  }
  if (settings?.seo?.description) {
    metadata.description = settings.seo.description;
  }


  const { heading, body } = resolveFonts(settings);
  const brandVars = themeCssVars(settings);
  const brandName = settings?.brandName || "Buy n Try";
  const loadClarity = shouldLoadClarity({
    id: CLARITY_ID,
    isAdmin: !pathname || pathname.startsWith("/admin"),
    host: hdrs.get("x-forwarded-host") || hdrs.get("host") || "",
  });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: brandName,
      alternateName: ["buyntryy", "Buy n Try"],
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
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

  return (
    <html
      lang="en"
      className={cn(heading.variable, body.variable)}
    >
      <head>
        <link rel="preconnect" href="https://scripts.clarity.ms" />
        <link rel="preconnect" href="https://www.clarity.ms" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {brandVars && (
          <style dangerouslySetInnerHTML={{ __html: `:root{${brandVars}}` }} />
        )}
        <script
          dangerouslySetInnerHTML={{ __html: themePreviewScript() }}
        />
        {GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true});`,
              }}
            />
          </>
        )}
        {process.env.NEXT_PUBLIC_ADSENSE_PUB_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
          />
        )}
        {loadClarity && (
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `window.addEventListener('load',function(){(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");});`,
            }}
          />
        )}
      </head>
      <body className="flex min-h-dvh flex-col bg-background font-sans antialiased">
        <Suspense fallback={<div className="flex min-h-dvh flex-col">{children}</div>}>
          <AppChrome
            settings={settings}
            shopTypes={shopTypes}
            urgencyTicker={<UrgencyTicker announcement={config.announcement} />}
            cartDrawer={<CartDrawer />}
            reviewReminder={<ReviewReminderPopup />}
            cartEffects={<CartEffects />}
            compareBar={<CompareBarWrapper />}
            demoBanner={<DemoBanner />}
          >
            <StorefrontAnnouncementBar />
            <StorefrontPromoPopup />
            {children}
          </AppChrome>
        </Suspense>
      </body>
    </html>
  );
}
