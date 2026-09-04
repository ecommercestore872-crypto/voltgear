import Image from "next/image";
import Link from "next/link";
import { Banknote, Mail, Phone, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { GadgetFooterNewsletter } from "@/components/gadget/gadget-footer-newsletter";
import { getSocialIcon } from "@/components/icons/social-icons";
import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import { gadgetShopTypeLinks, products2Href } from "@/lib/gadget-preview";
import { imageUrl } from "@/lib/sanity/image";
import type { SiteSettings } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/blog", label: "Blogs" },
  { href: "/faq", label: "Customer Care" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms and Conditions" },
  { href: "/bulk-order", label: "Corporate Orders" },
  { href: "/", label: "Official Brand Outlet" },
];

const CARE_LINKS = [
  { href: "/contact", label: "Register a Complaint" },
  { href: "/track", label: "Track Your Order" },
  { href: "/faq#payments", label: "Modes Of Payments" },
  { href: "/warranty", label: "Warranty Policy" },
  { href: "/shipping-returns#returns", label: "Exchange and Refund Policy" },
  { href: "/shipping-returns#shipping", label: "Shipping Policy" },
];

function splitTwo<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block py-1.5 text-[13px] text-white/85 transition hover:text-[var(--g-white)] min-h-[36px] flex items-center"
    >
      {label}
    </Link>
  );
}

export function GadgetFooter({
  settings,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  settings: SiteSettings | null;
  shopTypes?: ShopType[];
}) {
  const brandName = settings?.brandName || "VoltGear";
  const logoUrl = settings?.logo ? imageUrl(settings.logo, { w: 200 }) : undefined;
  const shopLinks = [
    { href: products2Href(), label: "All Products" },
    ...gadgetShopTypeLinks(shopTypes),
  ];
  const [shopA, shopB] = splitTwo(shopLinks);
  const [companyA, companyB] = splitTwo(COMPANY_LINKS);
  const phone = settings?.phone;
  const email = settings?.email;
  const socials = (settings?.socialLinks ?? []).filter(
    (s) => s.platform && s.url && s.url.startsWith("http")
  );

  const threshold = settings?.freeShippingThreshold ?? 3000;
  const warrantyMonths = settings?.warrantyMonths ?? 12;
  const returnWindowDays = settings?.returnWindowDays ?? 7;
  const codEnabled = settings?.codEnabled ?? true;

  return (
    <footer className="bg-[var(--g-cream)] pt-6 sm:px-3 sm:pb-3 sm:pt-8">
      <div className="overflow-hidden rounded-t-[2.25rem] bg-[var(--g-forest)] text-[var(--g-white)] sm:rounded-[2.25rem]">
        {/* Pre-footer Trust Row */}
        <div className="border-b border-white/10 px-5 py-6 sm:px-8">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 text-center sm:grid-cols-4 sm:gap-6">
            <div className="flex flex-col items-center gap-1.5 p-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-sm">
                <Truck className="h-5 w-5 stroke-[1.6]" />
              </span>
              <p className="text-xs font-bold text-white">{threshold > 0 ? "Free Shipping" : "Fast Shipping"}</p>
              <p className="text-[11px] text-white/60">
                {threshold > 0 ? `On orders over ${formatPrice(threshold)}` : "Across the country"}
              </p>
            </div>
            {codEnabled && (
              <div className="flex flex-col items-center gap-1.5 p-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-sm">
                  <Banknote className="h-5 w-5 stroke-[1.6]" />
                </span>
                <p className="text-xs font-bold text-white">Cash on Delivery</p>
                <p className="text-[11px] text-white/60">Pay at your doorstep</p>
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5 p-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5 stroke-[1.6]" />
              </span>
              <p className="text-xs font-bold text-white">{warrantyMonths}-Month Warranty</p>
              <p className="text-[11px] text-white/60">100% genuine replacement</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-sm">
                <RotateCcw className="h-5 w-5 stroke-[1.6]" />
              </span>
              <p className="text-xs font-bold text-white">Easy Returns</p>
              <p className="text-[11px] text-white/60">{returnWindowDays}-day hassle-free policy</p>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.15fr_1fr_0.85fr_1.1fr] lg:gap-8 lg:py-14 xl:gap-12">
          {/* Shop */}
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--g-white)]">
              Shop
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4">
              <ul>
                {shopA.map((l) => (
                  <li key={l.href}>
                    <FooterLink href={l.href} label={l.label} />
                  </li>
                ))}
              </ul>
              <ul>
                {shopB.map((l) => (
                  <li key={l.href}>
                    <FooterLink href={l.href} label={l.label} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Company */}
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--g-white)]">
              Company
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4">
              <ul>
                {companyA.map((l) => (
                  <li key={l.href}>
                    <FooterLink href={l.href} label={l.label} />
                  </li>
                ))}
              </ul>
              <ul>
                {companyB.map((l) => (
                  <li key={l.href}>
                    <FooterLink href={l.href} label={l.label} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Care */}
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--g-white)]">
              Care
            </h2>
            <ul className="mt-4">
              {CARE_LINKS.map((l) => (
                <li key={l.href + l.label}>
                  <FooterLink href={l.href} label={l.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* Brand + contact + newsletter */}
          <div className="flex flex-col">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brandName}
                width={140}
                height={40}
                className="h-9 w-auto object-contain object-left brightness-0 invert"
              />
            ) : (
              <p className="gadget-display text-2xl font-semibold tracking-[-0.02em] text-[var(--g-cream)]">
                {brandName}
              </p>
            )}

            {socials.length ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {socials.map((social) => {
                  if (!social.platform || !social.url) return null;
                  const Icon = getSocialIcon(social.platform);
                  return (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.platform}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/80 transition hover:border-white hover:text-[var(--g-white)]"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-6 space-y-2.5">
              <p className="text-sm text-white/75">We’re here to help.</p>
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 text-sm text-white/85 transition hover:text-[var(--g-white)]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[var(--g-sage)]" aria-hidden />
                  <span>
                    Call Us: <span className="font-medium text-[var(--g-white)]">{phone}</span>
                  </span>
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-white/85 transition hover:text-[var(--g-white)]"
                >
                  <Mail className="h-4 w-4 shrink-0 text-[var(--g-sage)]" aria-hidden />
                  <span>
                    Email Us: <span className="font-medium text-[var(--g-white)]">{email}</span>
                  </span>
                </a>
              ) : null}
            </div>

            <div className="mt-6">
              <GadgetFooterNewsletter />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-white/50">
            <p>
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </p>
            <Link href="/products2" aria-label="Shop all electronic products in catalog" className="min-h-10 inline-flex items-center transition hover:text-[var(--g-white)]">
              Shop all products
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
