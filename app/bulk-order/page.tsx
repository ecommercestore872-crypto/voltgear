"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Package, Send, ShieldCheck, Truck } from "lucide-react";

import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { warrantyLabel } from "@/lib/site-config";
import { useSiteConfig } from "@/lib/use-site-config";

export default function BulkOrderPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const config = useSiteConfig();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type: "bulk-order-inquiry" }),
      });
    } catch {
      /* still show success UX for inquiry capture */
    }
    setSending(false);
    setSubmitted(true);
  }

  const field =
    "h-11 w-full min-w-0 rounded-xl border border-[var(--g-line)] bg-[var(--g-white)] px-3 text-base outline-none focus:border-[var(--g-forest)] sm:text-sm";
  const label = "text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g-taupe)]";

  return (
    <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
      <div className="border-b border-[var(--g-line)] bg-[var(--g-cream-deep)]">
        <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
            Company
          </p>
          <h1 className="gadget-display mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Bulk &amp; wholesale
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--g-taupe)] sm:text-base">
            Corporate gifts, resellers, and teams — volume pricing from 10+ units with delivery
            support.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-4 text-center">
                <Package className="mx-auto h-7 w-7 text-[var(--g-forest)]" />
                <p className="mt-2 text-sm font-semibold">10+ units</p>
                <p className="text-xs text-[var(--g-taupe)]">Volume discounts start here</p>
              </div>
              <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-4 text-center">
                <Truck className="mx-auto h-7 w-7 text-[var(--g-forest)]" />
                <p className="mt-2 text-sm font-semibold">Delivery support</p>
                <p className="text-xs text-[var(--g-taupe)]">On qualifying bulk orders</p>
              </div>
              {config.warrantyMonths ? (
                <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-4 text-center">
                  <ShieldCheck className="mx-auto h-7 w-7 text-[var(--g-forest)]" />
                  <p className="mt-2 text-sm font-semibold">Warranty included</p>
                  <p className="text-xs text-[var(--g-taupe)]">
                    {warrantyLabel(config.warrantyMonths)}
                  </p>
                </div>
              ) : null}
            </div>

            <h2 className="mt-8 text-lg font-semibold">Pricing tiers</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--g-taupe)]">
              <li>Discounts scale with quantity</li>
              <li>Ask for a custom quote on 200+ units</li>
              <li>
                Prefer WhatsApp? Use{" "}
                <Link href="/contact" className="font-semibold text-[var(--g-forest)] hover:underline">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          <div className="h-fit min-w-0 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-4 sm:p-6 lg:sticky lg:top-24">
            {submitted ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-[var(--g-forest)]" />
                <h3 className="mt-4 text-lg font-semibold">Inquiry submitted</h3>
                <p className="mt-2 text-sm text-[var(--g-taupe)]">
                  We&apos;ll get back to you with a custom quote.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="gadget-display text-xl font-semibold">Request a quote</h2>
                <div className="space-y-1.5">
                  <label htmlFor="company" className={label}>
                    Company *
                  </label>
                  <input id="company" name="company" required placeholder="Your company" className={field} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className={label}>
                    Contact name *
                  </label>
                  <input id="contact-name" name="contactName" required placeholder="Full name" className={field} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className={label}>
                    Email *
                  </label>
                  <input id="contact-email" name="email" type="email" required placeholder="you@company.com" className={field} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-phone" className={label}>
                    Phone
                  </label>
                  <input id="contact-phone" name="phone" type="tel" placeholder="+92 300 0000000" className={field} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="quantity" className={label}>
                    Estimated quantity *
                  </label>
                  <input id="quantity" name="quantity" type="number" min={10} required placeholder="e.g. 50" className={field} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className={label}>
                    Details
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    placeholder="Products, city, timeline…"
                    className="w-full min-w-0 rounded-xl border border-[var(--g-line)] bg-[var(--g-white)] px-3 py-2.5 text-base outline-none focus:border-[var(--g-forest)] sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--g-forest)] text-sm font-semibold text-[var(--g-white)] hover:bg-[var(--g-forest-mid)] disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit inquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
