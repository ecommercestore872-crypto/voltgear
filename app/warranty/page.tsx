import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";

import {
  GadgetSupportCard,
  GadgetSupportLayout,
} from "@/components/gadget/gadget-support-layout";
import { getSettings } from "@/lib/sanity/settings";
import {
  normalizeSettings,
  returnsLabel,
  warrantyLabel,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Warranty Policy",
  description: "Buy n Try warranty coverage and how to claim.",
};

export default async function WarrantyPage() {
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const email = config.supportEmail;

  return (
    <GadgetSupportLayout
      eyebrow="Care"
      title="Warranty policy"
      description="Every Buy n Try product is backed by our commitment to quality. Here’s what’s covered and how to claim."
      related={[
        { href: "/shipping-returns#returns", label: "Exchange & refunds" },
        { href: "/contact", label: "Register a complaint" },
        { href: "/track", label: "Track order" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <GadgetSupportCard
          icon={<ShieldCheck className="h-6 w-6" aria-hidden />}
          title={
            config.warrantyMonths
              ? warrantyLabel(config.warrantyMonths)
              : "Warranty coverage"
          }
        >
          {config.warrantyMonths ? (
            <p>
              Coverage on manufacturing defects and hardware failures for{" "}
              {config.warrantyMonths} months from the date of purchase.
            </p>
          ) : (
            <p>
              Warranty terms are being finalized. Contact us with your order number and
              we&apos;ll take care of any issues.
            </p>
          )}
        </GadgetSupportCard>
        <GadgetSupportCard
          icon={<CheckCircle2 className="h-6 w-6" aria-hidden />}
          title={
            config.returnWindowDays
              ? returnsLabel(config.returnWindowDays)
              : "Returns"
          }
        >
          {config.returnWindowDays ? (
            <p>
              Changed your mind? Return unused products within {config.returnWindowDays}{" "}
              days — see{" "}
              <Link href="/shipping-returns#returns" className="font-semibold text-[var(--g-forest)] hover:underline">
                exchange &amp; refunds
              </Link>
              .
            </p>
          ) : (
            <p>
              Return terms are being finalized. Contact us with your order number and
              we&apos;ll help.
            </p>
          )}
        </GadgetSupportCard>
      </div>

      <div className="mt-6 space-y-4">
        <GadgetSupportCard title="How to claim warranty">
          <ol className="list-decimal space-y-3 pl-4">
            <li>
              {email ? (
                <>
                  Email{" "}
                  <a href={`mailto:${email}`} className="font-semibold text-[var(--g-forest)] hover:underline">
                    {email}
                  </a>{" "}
                  or use our{" "}
                  <Link href="/contact" className="font-semibold text-[var(--g-forest)] hover:underline">
                    contact page
                  </Link>{" "}
                  with your order number.
                </>
              ) : (
                <>
                  Use our{" "}
                  <Link href="/contact" className="font-semibold text-[var(--g-forest)] hover:underline">
                    contact page
                  </Link>{" "}
                  with your order number.
                </>
              )}
            </li>
            <li>Describe the issue and attach photos or a short video if you can.</li>
            <li>We&apos;ll review and arrange repair or replacement when covered.</li>
          </ol>
        </GadgetSupportCard>

        <div className="rounded-2xl bg-[var(--g-forest)] p-5 text-[var(--g-white)] sm:p-6">
          <div className="flex items-center gap-2 font-semibold">
            <Mail className="h-4 w-4 text-[var(--g-sage)]" aria-hidden />
            Need help?
          </div>
          <p className="mt-2 text-sm text-white/80">
            WhatsApp or call via{" "}
            <Link href="/contact" className="font-semibold text-[var(--g-cream)] underline-offset-2 hover:underline">
              Contact us
            </Link>{" "}
            — we usually reply the same day.
          </p>
        </div>
      </div>
    </GadgetSupportLayout>
  );
}
