import type { Metadata } from "next";

import { AdsensePrivacyDisclosures } from "@/components/legal/adsense-privacy-disclosures";
import {
  GadgetArticleShell,
  GadgetCmsSections,
  cmsCover,
  loadCmsPage,
} from "@/components/gadget/gadget-article-shell";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadCmsPage("privacy-policy");
  return {
    title: page?.seo?.title || page?.title || "Privacy Policy",
    description:
      page?.seo?.description ||
      page?.excerpt ||
      "How Buy n Try collects, uses, and shares information, including Google advertising cookies.",
    alternates: { canonical: "/privacy-policy" },
  };
}

export default async function PrivacyPolicyPage() {
  const page = await loadCmsPage("privacy-policy");
  const settings = await getSettings().catch(() => null);
  const brand = normalizeSettings(settings).storeName;
  const email = normalizeSettings(settings).supportEmail;
  const address = settings?.address?.trim();

  return (
    <GadgetArticleShell
      eyebrow="Legal"
      title={page?.title || "Privacy policy"}
      description={
        page?.excerpt ||
        `How ${brand} handles orders, support messages, cookies, and advertising on buyntryy.com.`
      }
      coverUrl={cmsCover(page)}
      backHref="/contact"
      backLabel="Contact us"
    >
      {page?.sections?.length ? (
        <GadgetCmsSections page={page} />
      ) : (
        <div>
          <h2>Who we are</h2>
          <p>
            This policy applies to {brand} at buyntryy.com, an online shop for consumer electronics
            accessories sold in Pakistan with cash on delivery. It is written for shoppers and
            visitors, not for children. This site is not directed at children under 13.
          </p>
          {address ? <p>Business correspondence address: {address}.</p> : null}

          <h2>What we collect</h2>
          <p>
            When you place an order or message us, we collect the details you provide: name, phone,
            email, delivery address, city, and order contents. We also store cart and checkout
            session data so your basket is not lost while you shop.
          </p>
          <p>
            If you subscribe to restock or newsletter updates, we keep the email you typed until you
            ask us to remove it.
          </p>

          <h2>How we use information</h2>
          <p>
            We use this information to confirm and dispatch Cash on Delivery orders, send order
            email, handle warranty and return requests, answer support, and keep the storefront
            working. We do not sell your personal information.
          </p>

          <h2>Who we share with</h2>
          <p>
            Couriers receive the name, phone, and address needed to deliver a parcel. Payment is
            typically collected in cash at the door. Hosting, email, and analytics providers process
            data only to run this shop. We share data when the law requires it.
          </p>

          <h2>First-party cookies</h2>
          <p>
            Essential cookies remember your cart, checkout progress, and cookie choice. They are
            required for the shop to function. Analytics tools (if enabled) measure which pages are
            used so we can fix broken flows. You can limit non-essential cookies from the cookie
            bar or your browser. See our{" "}
            <a href="/cookies">cookie policy</a>.
          </p>

          <h2>Your choices</h2>
          <p>
            Ask us to correct or delete account or order-contact details via the{" "}
            <a href="/contact">contact page</a>
            {email ? (
              <>
                {" "}
                or {email}
              </>
            ) : null}
            . We keep order records as needed for warranties, disputes, and tax/accounting duties.
          </p>
        </div>
      )}
      <AdsensePrivacyDisclosures />
    </GadgetArticleShell>
  );
}
