import type { Metadata } from "next";
import Link from "next/link";

import { GadgetArticleShell } from "@/components/gadget/gadget-article-shell";
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
      description={`${SHOPPER_BRAND.spokenName} uses cookies so the shop works and to measure visits, orders and our own ads.`}
      backHref="/privacy-policy"
      backLabel="Privacy policy"
    >
      <h2>Essential cookies</h2>
      <p>
        These keep your cart and checkout details. The store cannot complete an
        order without them.
      </p>

      <h2>Visit and order measurement</h2>
      <p>
        We measure how visitors use the shop so we can fix problems and know
        whether our ads lead to orders. This is always on for every visitor:
        there is no setting to turn it off here.
      </p>
      <ul>
        <li>
          Microsoft Clarity records how pages are used (clicks, scrolling and
          screen recordings) to improve pages and checkout.
        </li>
        <li>
          Meta (Facebook and Instagram) records page views, product views,
          add-to-cart, checkout and order events, from your first visit and
          from our server after you place an order.
        </li>
        <li>
          TikTok records the same kinds of shopping events for our TikTok
          ads.
        </li>
        <li>
          We store which ad or link brought you to the shop and attach it to
          your order.
        </li>
      </ul>
      <p>
        These tools may receive a random visitor ID, cookie IDs, your IP
        address and browser details, and, after you place an order, your
        details in hashed (scrambled) form. This continues even if your browser
        sends a Global Privacy Control or Do Not Track signal. If you do not
        want to be measured, please do not use the shop, or contact us. See
        the advertising section of our{" "}
        <Link href="/privacy-policy">privacy policy</Link>.
      </p>
    </GadgetArticleShell>
  );
}

export const revalidate = 3600;
