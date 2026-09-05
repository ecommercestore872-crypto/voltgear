import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, HelpCircle, Wallet } from "lucide-react";

import {
  GadgetSupportCard,
  GadgetSupportLayout,
} from "@/components/gadget/gadget-support-layout";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "FAQs & Payments | Buy n Try",
  description:
    "Cash on delivery, payments, orders, shipping, and warranty answers from Buy n Try (buyntryy.com).",
  alternates: { canonical: "/faq" },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do you offer cash on delivery?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Buy n Try offers cash on delivery on eligible orders in Pakistan. Pay the courier when the parcel arrives.",
      },
    },
    {
      "@type": "Question",
      name: "How do I track or change an order?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the Track order page with your order number. Contact Buy n Try quickly if you need to change the address or cancel.",
      },
    },
    {
      "@type": "Question",
      name: "What is the delivery and return policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shipping timelines, exchanges, refunds, and warranty coverage are listed on the Shipping & returns and Warranty pages.",
      },
    },
  ],
};

export default async function FaqPage() {
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);

  return (
    <GadgetSupportLayout
      eyebrow="Care"
      title="Customer care"
      description="Quick answers on payments, orders, and delivery. Still stuck? WhatsApp or call us."
      related={[
        { href: "/contact", label: "Contact us" },
        { href: "/track", label: "Track order" },
        { href: "/shipping-returns", label: "Shipping & returns" },
        { href: "/warranty", label: "Warranty" },
      ]}
    >
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <a
          href="#payments"
          className="rounded-full bg-[var(--g-forest)] px-3 py-1.5 font-semibold text-[var(--g-white)]"
        >
          Modes of payments
        </a>
        <a
          href="#orders"
          className="rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-3 py-1.5 font-medium hover:border-[var(--g-forest)]"
        >
          Orders
        </a>
        <a
          href="#delivery"
          className="rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-3 py-1.5 font-medium hover:border-[var(--g-forest)]"
        >
          Delivery
        </a>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <div className="space-y-4">
        <GadgetSupportCard
          id="payments"
          icon={<Wallet className="h-6 w-6" aria-hidden />}
          title="Modes of payments"
        >
          {config.codEnabled ? (
            <>
              <p>
                <strong className="text-[var(--g-charcoal)]">Cash on delivery (COD)</strong> is
                available on eligible orders — pay the courier when your parcel arrives.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-4">
                <li>No online card checkout required for standard orders.</li>
                <li>Have the exact amount ready when possible to speed up handover.</li>
                <li>Order total (including shipping) is confirmed on your checkout page.</li>
              </ul>
            </>
          ) : (
            <p>
              Payment options are confirmed at checkout. Contact support if you need help
              completing an order.
            </p>
          )}
        </GadgetSupportCard>

        <GadgetSupportCard
          id="orders"
          icon={<Banknote className="h-6 w-6" aria-hidden />}
          title="Orders & changes"
        >
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              Track status anytime on{" "}
              <Link href="/track" className="font-semibold text-[var(--g-forest)] hover:underline">
                Track your order
              </Link>
              .
            </li>
            <li>
              Need to change address or cancel soon after ordering?{" "}
              <Link href="/contact" className="font-semibold text-[var(--g-forest)] hover:underline">
                Contact us
              </Link>{" "}
              quickly with your order number.
            </li>
            <li>
              Bulk / corporate purchases: see{" "}
              <Link href="/bulk-order" className="font-semibold text-[var(--g-forest)] hover:underline">
                Corporate orders
              </Link>
              .
            </li>
          </ul>
        </GadgetSupportCard>

        <GadgetSupportCard
          id="delivery"
          icon={<HelpCircle className="h-6 w-6" aria-hidden />}
          title="Delivery & warranty"
        >
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              Shipping timelines and fees:{" "}
              <Link
                href="/shipping-returns#shipping"
                className="font-semibold text-[var(--g-forest)] hover:underline"
              >
                Shipping policy
              </Link>
              .
            </li>
            <li>
              Exchanges and refunds:{" "}
              <Link
                href="/shipping-returns#returns"
                className="font-semibold text-[var(--g-forest)] hover:underline"
              >
                Exchange &amp; refund policy
              </Link>
              .
            </li>
            <li>
              Defects and coverage:{" "}
              <Link href="/warranty" className="font-semibold text-[var(--g-forest)] hover:underline">
                Warranty policy
              </Link>
              .
            </li>
          </ul>
        </GadgetSupportCard>
      </div>
    </GadgetSupportLayout>
  );
}
