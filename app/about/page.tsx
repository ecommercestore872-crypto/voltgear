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
  const page = await loadCmsPage("about");
  return {
    title:
      page?.seo?.title || page?.title || `About ${SHOPPER_BRAND.spokenName}`,
    description:
      page?.seo?.description ||
      page?.excerpt ||
      "Buy n Try is a Pakistan electronics-accessories shop: cash on delivery, warranty-backed gear, and human support.",
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const page = await loadCmsPage("about");
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const brand = config.storeName;
  const address = settings?.address?.trim();

  return (
    <GadgetArticleShell
      eyebrow="Company"
      title={page?.title || `About ${brand}`}
      description={
        page?.excerpt ||
        `${brand} sells everyday tech accessories in Pakistan — chargers, audio, power banks, smartwatches, and creator gear — with cash on delivery and real after-sales help.`
      }
      coverUrl={cmsCover(page)}
      backHref="/"
      backLabel="Back to shop"
    >
      {page?.sections?.length ? (
        <GadgetCmsSections page={page} />
      ) : (
        <div>
          <h2>Why this shop exists</h2>
          <p>
            {brand} started because buying a charger, earbuds, or a small camera
            stand in Pakistan is often a guess: the listing looks fine, the
            parcel arrives, and there is nobody to call if the cable is the
            wrong type or the battery is weak. We built a storefront that shows
            the product, ships cash on delivery nationwide, and keeps a person
            on WhatsApp and email when something is wrong.
          </p>
          <p>
            We are not a marketplace of random sellers. Listings on buyntryy.com
            are the catalogue we pack and dispatch. If a title, photo, or spec
            is unclear, that is on us to fix — not on a third-party vendor you
            cannot reach.
          </p>

          <h2>What we sell</h2>
          <p>
            The range is consumer electronics accessories: fast chargers and GaN
            adapters, power banks, wireless earbuds, smartwatches, tripods, ring
            lights, and wireless microphones. We write buying guides on the{" "}
            <Link href="/blog">blog</Link> so you can compare wattage,
            connectors, and battery claims before you order — not after the
            courier has left.
          </p>
          <p>
            Browse the full catalogue from{" "}
            <Link href="/products">all products</Link>. Category pages group
            items the way people shop: audio, power, wearables, and creator
            tools.
          </p>

          <h2>How buying works</h2>
          <p>
            Checkout is cash on delivery on eligible orders. You pay the courier
            when the parcel arrives. We may call or message to confirm a new
            address before dispatch. Shipping times, free-shipping thresholds,
            exchanges, and refunds are written on{" "}
            <Link href="/shipping-returns">Shipping &amp; returns</Link>.
            Warranty coverage is on <Link href="/warranty">Warranty</Link>.
          </p>
          <p>
            Track a parcel anytime on <Link href="/track">Track order</Link>{" "}
            with your order number and email.
          </p>

          <h2>Who we are accountable to</h2>
          <p>
            {brand} serves shoppers in Pakistan. Support is in English and
            everyday Urdu on WhatsApp. We reply on working days, usually the
            same day. Use <Link href="/contact">Contact us</Link> for orders,
            defects, and complaints — include the order number so we can find
            the parcel.
          </p>
          {address ? <p>Correspondence address: {address}.</p> : null}
          {config.supportEmail ? <p>Email: {config.supportEmail}.</p> : null}
          {config.supportPhone ? <p>Phone: {config.supportPhone}.</p> : null}

          <h2>Editorial and ads</h2>
          <p>
            Guides and product copy are written for this shop. We do not scrape
            other sites for filler articles. If we later show Google ads on
            content pages, ads are labelled as advertisements and are not mixed
            into menus or checkout buttons. Legal pages:{" "}
            <Link href="/privacy-policy">Privacy</Link>,{" "}
            <Link href="/cookies">Cookies</Link>,{" "}
            <Link href="/terms-of-service">Terms</Link>.
          </p>
        </div>
      )}
    </GadgetArticleShell>
  );
}
