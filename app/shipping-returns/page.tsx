import type { Metadata } from "next";
import Link from "next/link";
import { Package, RefreshCw, Truck } from "lucide-react";

import {
  GadgetSupportCard,
  GadgetSupportLayout,
} from "@/components/gadget/gadget-support-layout";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings, returnsLabel } from "@/lib/site-config";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shipping, Exchange & Refunds",
  description:
    "Shipping times, cash on delivery, exchanges, and refund policy.",
  alternates: { canonical: "/shipping-returns" },
};

export default async function ShippingReturnsPage() {
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);

  return (
    <GadgetSupportLayout
      eyebrow="Care"
      title="Shipping & returns"
      description="Clear delivery expectations, exchanges, and refunds — so you know what happens after you order."
      related={[
        { href: "/track", label: "Track your order" },
        { href: "/warranty", label: "Warranty policy" },
        { href: "/faq#payments", label: "Modes of payments" },
        { href: "/contact", label: "Contact us" },
      ]}
    >
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <a
          href="#shipping"
          className="rounded-full bg-[var(--g-forest)] px-3 py-1.5 font-semibold text-[var(--g-white)]"
        >
          Shipping
        </a>
        <a
          href="#returns"
          className="rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-3 py-1.5 font-medium text-[var(--g-charcoal)] hover:border-[var(--g-forest)]"
        >
          Exchange &amp; refunds
        </a>
      </div>

      <div className="space-y-4">
        <GadgetSupportCard
          id="shipping"
          icon={<Truck className="h-6 w-6" aria-hidden />}
          title="Shipping policy"
        >
          <p>
            We ship nationwide. Orders are packed after confirmation and usually
            leave our warehouse within 1–2 working days.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-4">
            <li>Typical delivery: 2–5 working days depending on your city.</li>
            {config.freeShippingThreshold > 0 ? (
              <li>
                Free shipping on orders of{" "}
                {formatPrice(config.freeShippingThreshold)} or more. Below that,
                a flat shipping fee of {formatPrice(config.shippingFee)} may
                apply.
              </li>
            ) : (
              <li>
                Shipping fee: {formatPrice(config.shippingFee)} (shown at
                checkout).
              </li>
            )}
            <li>
              Track progress anytime on{" "}
              <Link
                href="/track"
                className="font-semibold text-[var(--g-forest)] hover:underline"
              >
                Track your order
              </Link>
              .
            </li>
          </ul>
        </GadgetSupportCard>

        <GadgetSupportCard
          id="returns"
          icon={<RefreshCw className="h-6 w-6" aria-hidden />}
          title="Exchange and refund policy"
        >
          {config.returnWindowDays ? (
            <p>
              You can request an exchange or refund on unused items within{" "}
              <strong className="text-[var(--g-charcoal)]">
                {returnsLabel(config.returnWindowDays).toLowerCase()}
              </strong>{" "}
              of delivery.
            </p>
          ) : (
            <p>
              Exchange and refund windows are confirmed with your order. Contact
              us with your order number and we&apos;ll guide you.
            </p>
          )}
          <ul className="mt-3 list-disc space-y-1.5 pl-4">
            <li>
              Items should be unused, with original packaging and accessories.
            </li>
            <li>
              Defective or DOA units are covered under warranty / replacement
              first.
            </li>
            <li>
              Start a request via{" "}
              <Link
                href="/contact"
                className="font-semibold text-[var(--g-forest)] hover:underline"
              >
                Contact us
              </Link>{" "}
              or WhatsApp — include order number and photos if relevant.
            </li>
            <li>
              Approved refunds are processed after we receive and inspect the
              return.
            </li>
          </ul>
        </GadgetSupportCard>

        <GadgetSupportCard
          icon={<Package className="h-6 w-6" aria-hidden />}
          title="What if my parcel is delayed?"
        >
          <p>
            Check{" "}
            <Link
              href="/track"
              className="font-semibold text-[var(--g-forest)] hover:underline"
            >
              order tracking
            </Link>{" "}
            first. If status hasn&apos;t moved for several working days,{" "}
            <Link
              href="/contact"
              className="font-semibold text-[var(--g-forest)] hover:underline"
            >
              register a complaint
            </Link>{" "}
            and we&apos;ll escalate with the courier.
          </p>
        </GadgetSupportCard>
      </div>
    </GadgetSupportLayout>
  );
}
