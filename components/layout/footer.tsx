import Image from "next/image";
import Link from "next/link";

import { imageUrl } from "@/lib/sanity/image";
import { FALLBACK_SHOP_TYPES, shopTypeLinks, type ShopType } from "@/lib/categories";
import { Separator } from "@/components/ui/separator";
import { getSocialIcon } from "@/components/icons/social-icons";
import type { SiteSettings } from "@/lib/types";

export function Footer({
  settings,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  settings: SiteSettings | null;
  shopTypes?: ShopType[];
}) {
  const links = shopTypeLinks(shopTypes);
  const brandName = settings?.brandName || "Buy n Try";
  const logoUrl = settings?.logo
    ? imageUrl(settings.logo, { w: 120 })
    : undefined;

  return (
    <footer className="border-t border-deep bg-deep text-white">
      <div className="container mx-auto grid gap-x-10 gap-y-12 px-4 py-16 md:grid-cols-2 lg:grid-cols-5 lg:px-8 max-w-7xl">
        {/* Brand column */}
        <div className="space-y-5 lg:col-span-2 pr-10">
          <Link href="/" className="inline-flex min-h-11 w-fit items-center" aria-label={`${brandName} home`}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brandName}
                width={140}
                height={40}
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            ) : (
              <p className="text-xl font-bold tracking-tight">
                {brandName}
                <span className="text-white/40">.</span>
              </p>
            )}
          </Link>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            {settings?.tagline ||
              "Premium electronics accessories. Smarter tech for everyday life."}
          </p>
          {/* Social icons — only real configured links */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(settings?.socialLinks ?? [])
              .filter(
                (social) =>
                  social.platform &&
                  social.url &&
                  social.url.startsWith("http")
              )
              .map((social) =>
                social.platform && social.url ? (
                  <a
                    key={social.platform}
                    href={social.url}
                    aria-label={social.platform}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-white/70 transition-colors hover:border-white/50 hover:text-white"
                  >
                    {(() => {
                      const Icon = getSocialIcon(social.platform);
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </a>
                ) : null
              )}
          </div>
        </div>

        {/* Shop column */}
        <div>
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Shop
          </h3>
          <ul className="space-y-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/products"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                All Products
              </Link>
            </li>
          </ul>
        </div>

        {/* Company column */}
        <div>
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Company
          </h3>
          <ul className="space-y-3">
            <li>
              <Link
                href="/about"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                About {brandName}
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Blog
              </Link>
            </li>
            <li>
              <Link
                href="/bulk-order"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Bulk Orders
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="/faq"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        {/* Support column */}
        <div>
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Customer Support
          </h3>
          <ul className="space-y-3">
            <li>
              <Link
                href="/track"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Track Your Order
              </Link>
            </li>
            <li>
              <Link
                href="/warranty"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Warranty &amp; Returns
              </Link>
            </li>
            <li>
              <Link
                href="/shipping-returns"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Shipping Info
              </Link>
            </li>
            <li>
              <Link
                href="/privacy-policy"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms-of-service"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                Terms of Service
              </Link>
            </li>
          </ul>

          {/* Contact details — only shown when real data is configured */}
          {(settings?.email || settings?.phone || settings?.address) && (
            <div className="mt-8">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                Get in Touch
              </h3>
              <ul className="space-y-2 text-sm text-white/70">
                {settings?.email && (
                  <li>
                    <a
                      href={`mailto:${settings.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {settings.email}
                    </a>
                  </li>
                )}
                {settings?.phone && (
                  <li>
                    <a
                      href={`tel:${settings.phone}`}
                      className="hover:text-white transition-colors"
                    >
                      {settings.phone}
                    </a>
                  </li>
                )}
                {settings?.address && (
                  <li className="leading-snug">{settings.address}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-white/10" />
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row lg:px-8 max-w-7xl">
        <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
        <p className="flex gap-4">
          <Link href="/privacy-policy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
        </p>
      </div>
    </footer>
  );
}