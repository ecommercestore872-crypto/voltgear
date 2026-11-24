import type { Metadata } from "next";
import Link from "next/link";

import { GadgetArticleShell } from "@/components/gadget/gadget-article-shell";
import { CookieSettingsButton } from "@/components/legal/cookie-settings-button";
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

      <h2>Advertising measurement</h2>
      <p>
        To measure whether our own ads lead to orders, Meta records shopping
        events such as page views, product views and orders from your first
        visit, without waiting for a choice. Choose Reject optional, or send
        a Global Privacy Control signal from your browser, to turn it off.
        TikTok measurement stays off until you allow advertising. See the
        advertising section of our{" "}
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
