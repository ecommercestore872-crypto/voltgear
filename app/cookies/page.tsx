import type { Metadata } from "next";
import Link from "next/link";

import { GadgetArticleShell } from "@/components/gadget/gadget-article-shell";
import {
  ADSENSE_ABOUTADS_URL,
  ADSENSE_ADS_SETTINGS_URL,
} from "@/lib/adsense-policy";
import { SHOPPER_BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Cookies used on the Buy n Try shop, including essential, analytics, and advertising cookies.",
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
        These keep your cart, checkout details, and cookie preference. The store cannot complete an
        order without them. They are not used to personalize ads.
      </p>

      <h2>Analytics cookies</h2>
      <p>
        If you choose Accept on the cookie bar, we may use first-party analytics and tools such as
        Google Analytics or Microsoft Clarity to understand which pages load and where checkout
        fails. These help us fix the shop. They are not required to browse or buy.
      </p>

      <h2>Advertising cookies</h2>
      <p>
        If Google AdSense is connected, Google and its partners may use cookies to serve ads based
        on visits to this site and other sites. You can opt out of personalized ads in{" "}
        <a href={ADSENSE_ADS_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
          Google Ads Settings
        </a>{" "}
        or at{" "}
        <a href={ADSENSE_ABOUTADS_URL} target="_blank" rel="noopener noreferrer">
          www.aboutads.info
        </a>
        . See the advertising section of our{" "}
        <Link href="/privacy-policy">privacy policy</Link>.
      </p>

      <h2>How to change your choice</h2>
      <p>
        Use your browser settings to delete cookies. On this site, choose Essential only or Accept
        on the cookie bar (it appears until you pick). Clearing site data will show the bar again.
      </p>
    </GadgetArticleShell>
  );
}
