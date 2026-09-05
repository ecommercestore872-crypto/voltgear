import type { Metadata } from "next";
import Link from "next/link";

import {
  GadgetArticleShell,
  GadgetCmsSections,
  cmsCover,
  loadCmsPage,
} from "@/components/gadget/gadget-article-shell";
import { SHOPPER_BRAND } from "@/lib/brand";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadCmsPage("terms-of-service");
  return {
    title: page?.seo?.title || page?.title || "Terms and Conditions",
    description:
      page?.seo?.description ||
      page?.excerpt ||
      "Terms for shopping at Buy n Try: orders, COD, acceptable use, and this website.",
    alternates: { canonical: "/terms-of-service" },
  };
}

export default async function TermsPage() {
  const page = await loadCmsPage("terms-of-service");
  const brand = normalizeSettings(await getSettings().catch(() => null)).storeName;

  return (
    <GadgetArticleShell
      eyebrow="Legal"
      title={page?.title || "Terms and conditions"}
      description={
        page?.excerpt ||
        `Rules for ordering from ${brand}, using buyntryy.com, and cash on delivery.`
      }
      coverUrl={cmsCover(page)}
      backHref="/faq"
      backLabel="Customer care"
    >
      {page?.sections?.length ? (
        <GadgetCmsSections page={page} />
      ) : (
        <div>
          <h2>Agreement</h2>
          <p>
            By browsing buyntryy.com or placing an order you agree to these terms, our{" "}
            <Link href="/privacy-policy">privacy policy</Link>,{" "}
            <Link href="/cookies">cookie policy</Link>,{" "}
            <Link href="/shipping-returns">shipping and returns</Link>, and{" "}
            <Link href="/warranty">warranty</Link> pages. If you do not agree, do not use the site.
          </p>
          <p>
            You must be 18 or older to place an order. This shop is for consumer purchases in
            Pakistan, not for children.
          </p>

          <h2>Orders and cash on delivery</h2>
          <p>
            Submitting checkout is an offer to buy the items in your cart at the prices shown,
            plus any shipping shown. We may call or message to confirm details. We may cancel an
            order we cannot fulfil (stock, failed confirmation, or a delivery address we cannot
            reach) and we will tell you.
          </p>
          <p>
            Cash on delivery means you pay the courier the order total when the parcel is handed
            over. Have the amount ready. Refusing a confirmed COD parcel without a valid reason may
            affect later orders.
          </p>

          <h2>Pricing, stock, and descriptions</h2>
          <p>
            Prices are in Pakistani rupees. Stock and prices can change. Photos and specs describe
            the product we intend to send; if we make a material mistake we will contact you before
            dispatch. We do not promise compatibility with every phone or laptop — check the
            listing and our{" "}
            <Link href="/blog">buying guides</Link>.
          </p>

          <h2>Acceptable use</h2>
          <p>
            Do not misuse the site: no scraping, no fake orders, no abuse of staff, and no attempt
            to interfere with checkout or tracking. Do not click advertisements to generate
            artificial traffic. Do not ask others to click ads. Ads, when shown, are labelled as
            advertisements or sponsored links — they are not menu items or download buttons.
          </p>

          <h2>Intellectual property</h2>
          <p>
            {SHOPPER_BRAND.spokenName} names, the BNT mark, product photos we publish, and original
            guide text are ours or used with permission. You may not copy the catalogue wholesale
            for another store.
          </p>

          <h2>Liability</h2>
          <p>
            We are responsible for sending the product you ordered and for the warranty we publish.
            We are not liable for delays caused by the courier, for device damage from incompatible
            accessories you chose against the listing, or for losses beyond the price of the
            affected order, except where Pakistan law does not allow that limit.
          </p>

          <h2>Law</h2>
          <p>
            These terms are governed by the laws of Pakistan. Disputes should first go through{" "}
            <Link href="/contact">customer support</Link> with your order number.
          </p>
        </div>
      )}
    </GadgetArticleShell>
  );
}
