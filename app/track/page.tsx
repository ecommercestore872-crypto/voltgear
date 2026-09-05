import type { Metadata } from "next";
import Link from "next/link";

import { GadgetSupportLayout } from "@/components/gadget/gadget-support-layout";
import { TrackOrder } from "@/components/orders/track-order";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Check the status of your Buy n Try order — confirmation, shipping and delivery updates.",
};

export const revalidate = 60;

export default function TrackPage() {
  return (
    <GadgetSupportLayout
      eyebrow="Care"
      title="Track your order"
      description="Enter the order number from your confirmation email and the email you used at checkout."
      related={[
        { href: "/contact", label: "Need help? Contact us" },
        { href: "/shipping-returns", label: "Shipping policy" },
        { href: "/warranty", label: "Warranty" },
      ]}
    >
      <div className="min-w-0 overflow-hidden">
        <TrackOrder />
      </div>
      <p className="mt-4 text-sm text-[var(--g-taupe)]">
        Can&apos;t find your order?{" "}
        <Link href="/contact" className="font-semibold text-[var(--g-forest)] hover:underline">
          Register a complaint
        </Link>{" "}
        and we&apos;ll dig in.
      </p>
    </GadgetSupportLayout>
  );
}
