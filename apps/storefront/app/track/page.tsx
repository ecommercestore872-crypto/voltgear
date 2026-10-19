import type { Metadata } from "next";
import Link from "next/link";

import { GadgetSupportLayout } from "@/components/gadget/gadget-support-layout";
import { TrackOrderLoader } from "./track-order-loader";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Check the status of your Buy n Try order — confirmation, shipping and delivery updates.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/track" },
};

export const revalidate = 3600;

export default function TrackPage() {
  return (
    <div className="premium-royal-page-bg min-h-dvh">
    <GadgetSupportLayout
      eyebrow="Care"
      title="Track your order"
      description="Enter your order number and mobile number from checkout. Status updates from PostEx when your parcel is booked with them."
      related={[
        { href: "/contact", label: "Need help? Contact us" },
        { href: "/shipping-returns", label: "Shipping policy" },
        { href: "/warranty", label: "Warranty" },
      ]}
    >
      <div className="min-w-0 overflow-hidden">
        <TrackOrderLoader />
      </div>
      <p className="mt-4 text-sm text-[var(--g-taupe)]">
        Can&apos;t find your order?{" "}
        <Link
          href="/contact"
          className="font-semibold text-[var(--g-forest)] hover:underline"
        >
          Register a complaint
        </Link>{" "}
        and we&apos;ll dig in.
      </p>
    </GadgetSupportLayout>
    </div>
  );
}
