import type { Metadata } from "next";
import Link from "next/link";

import { GadgetArticleShell } from "@/components/gadget/gadget-article-shell";
import { CookieSettingsButton } from "@/components/legal/cookie-settings-button";
import {
  ADSENSE_ABOUTADS_URL,
  ADSENSE_ADS_SETTINGS_URL,
} from "@/lib/adsense-policy";
import { SHOPPER_BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Cookies used on the Buy n Try shop, including essential and advertising cookies.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <GadgetArticleShell
      eyebrow="Legal"
      title="Cookie policy"
      description={`${SHOPPER_BRAND.spokenName} uses cookies so the shop works, and — if you allow them — to measure visits and show ads.`}
      backHref="/privacy-policy"
      backLabel="Privacy policy"
    >
      <h2>Essential cookies</h2>
      <p>
        These keep your cart, checkout details, and cookie preference. The store
        cannot complete an order without them. They are not used to personalize
        ads.
      </p>

      <h2>Optional analytics</h2>
      <p>
        If you allow analytics, Microsoft Clarity may measure how visitors use
        the shop so we can improve pages and checkout. It stays off when you
        reject analytics.
      </p>

      <h2>Optional advertising</h2>
      <p>
        If you allow advertising, Meta and TikTok may measure shopping events,
        and Google AdSense may show ads. Without advertising permission, these
        services stay off. If Google AdSense is connected, Google and its
        partners may use cookies to serve ads based on visits to this site and
        other sites. You can opt
        out of personalized ads in{" "}
        <a
          href={ADSENSE_ADS_SETTINGS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Ads Settings
        </a>{" "}
        or at{" "}
        <a
          href={ADSENSE_ABOUTADS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          www.aboutads.info
        </a>
        . See the advertising section of our{" "}
        <Link href="/privacy-policy">privacy policy</Link>.
      </p>

      <h2>How to change your choice</h2>
      <p>
        Choose Accept all, Reject optional, or set analytics and advertising
        separately. Use Cookie settings in the footer whenever you want to
        change your choice. Browser privacy opt-out signals override advertising
        permission.
      </p>
      <CookieSettingsButton className="min-h-11 rounded-lg border border-current px-4 font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2" />
    </GadgetArticleShell>
  );
}

export const revalidate = 3600;
