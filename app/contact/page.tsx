import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, Mail, MessageCircle, Package, Phone, ShieldCheck } from "lucide-react";

import { GadgetContactForm } from "@/components/gadget/gadget-contact-form";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { telHref, whatsappHref } from "@/lib/contact-links";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Reach Buy n Try on WhatsApp, phone, or email for orders, warranty, and support.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const wa = whatsappHref(config.whatsappNumber || config.supportPhone);
  const call = telHref(config.supportPhone);
  const email = config.supportEmail;

  return (
    <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
      <div className="border-b border-[var(--g-line)]">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
            Support
          </p>
          <h1 className="gadget-display mt-3 text-4xl tracking-[-0.03em] text-[var(--g-charcoal)] sm:text-5xl">
            Contact us
          </h1>
          <p className="gadget-body mt-3 max-w-xl sm:text-base">
            Questions about an order, warranty, or product? WhatsApp or call for the fastest reply —
            we usually get back the same day.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-[7.5rem] flex-col justify-between rounded-2xl bg-[var(--g-forest)] p-6 text-[var(--g-white)] transition hover:bg-[var(--g-forest-mid)]"
            >
              <MessageCircle className="h-7 w-7 opacity-90" aria-hidden />
              <div>
                <p className="text-lg font-semibold">WhatsApp us</p>
                <p className="mt-1 text-sm text-white/75">
                  Fastest for order status and product questions
                </p>
              </div>
            </a>
          ) : null}
          {call ? (
            <a
              href={call}
              className="group flex min-h-[7.5rem] flex-col justify-between rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-6 transition hover:border-[var(--g-forest)]"
            >
              <Phone className="h-7 w-7 text-[var(--g-forest)]" aria-hidden />
              <div>
                <p className="text-lg font-semibold text-[var(--g-charcoal)]">Call us</p>
                <p className="mt-1 text-sm text-[var(--g-taupe)]">
                  {config.supportPhone}
                </p>
              </div>
            </a>
          ) : null}
          {!wa && !call ? (
            <div className="rounded-2xl border border-dashed border-[var(--g-line)] bg-[var(--g-white)] p-6 sm:col-span-2">
              <Headphones className="h-7 w-7 text-[var(--g-sage)]" aria-hidden />
              <p className="mt-3 font-semibold">Support channels updating</p>
              <p className="mt-1 text-sm text-[var(--g-taupe)]">
                Use the form below{email ? " or email us" : ""} and we&apos;ll respond as soon as we can.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 font-medium text-[var(--g-forest)] hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {email}
            </a>
          ) : null}
          <Link
            href="/track"
            className="inline-flex items-center gap-2 font-medium text-[var(--g-charcoal)] hover:text-[var(--g-forest)]"
          >
            <Package className="h-4 w-4 text-[var(--g-sage)]" aria-hidden />
            Track an order
          </Link>
          <Link
            href="/warranty"
            className="inline-flex items-center gap-2 font-medium text-[var(--g-charcoal)] hover:text-[var(--g-forest)]"
          >
            <ShieldCheck className="h-4 w-4 text-[var(--g-sage)]" aria-hidden />
            Warranty &amp; returns
          </Link>
        </div>

        <div className="mt-10 max-w-2xl">
          <GadgetContactForm />
        </div>
      </div>
    </div>
  );
}
