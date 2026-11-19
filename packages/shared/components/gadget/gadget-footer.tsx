import { Mail, Phone, Plus } from "lucide-react";

import { ShopBrandMark } from "@/components/brand/shop-brand-mark";
import { GadgetFooterNewsletter } from "@/components/gadget/gadget-footer-newsletter";
import { GadgetSocialGlyph } from "@/components/gadget/gadget-social-glyphs";
import { CookieSettingsButton } from "@/components/legal/cookie-settings-button";
import { StorefrontLink as Link } from "@/components/navigation/storefront-link";
import { getPublicSocialLinks } from "@/lib/social-links-rules";
import { SHOPPER_BRAND } from "@/lib/brand";
import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import {
  DEFAULT_FOOTER_CARE_LINKS,
  DEFAULT_FOOTER_COMPANY_LINKS,
  resolveChromeLinks,
} from "@/lib/chrome-nav-rules";
import { gadgetShopTypeLinks, products2Href } from "@/lib/gadget-preview";
import type { SiteSettings } from "@/lib/types";
import { normalizeSettings } from "@/lib/site-config";

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[40px] items-center py-1 text-[13px] text-[var(--g-taupe)] transition hover:text-[var(--g-charcoal)]"
    >
      {label}
    </Link>
  );
}

type FooterGroup = { title: string; links: { href: string; label: string }[] };

function FooterAccordion({ group }: { group: FooterGroup }) {
  return (
    <details className="group border-b border-[var(--g-line)] py-1 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[17px] font-extrabold tracking-tight text-[var(--g-charcoal)]">
        {group.title}
        <Plus
          className="h-5 w-5 transition-transform group-open:rotate-45"
          aria-hidden
        />
      </summary>
      <ul className="pb-3">
        {group.links.map((l) => (
          <li key={l.href + l.label}>
            <FooterLink href={l.href} label={l.label} />
          </li>
        ))}
      </ul>
    </details>
  );
}

export function GadgetFooter({
  settings,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  settings: SiteSettings | null;
  shopTypes?: ShopType[];
}) {
  const brandName = settings?.brandName?.trim() || SHOPPER_BRAND.spokenName;
  const shopLinks = [
    { href: products2Href(), label: "All Products" },
    ...gadgetShopTypeLinks(shopTypes),
  ];
  const companyLinks = resolveChromeLinks(
    settings?.footerCompanyLinks,
    DEFAULT_FOOTER_COMPANY_LINKS,
  );
  const careLinks = resolveChromeLinks(
    settings?.footerCareLinks,
    DEFAULT_FOOTER_CARE_LINKS,
  );
  const phone = settings?.phone;
  const email = settings?.email;
  const config = normalizeSettings(settings);
  const socialLinks = getPublicSocialLinks(config);

  const groups: FooterGroup[] = [
    { title: "Products", links: shopLinks },
    ...(companyLinks.length ? [{ title: "Discover", links: companyLinks }] : []),
    ...(careLinks.length ? [{ title: "Support", links: careLinks }] : []),
  ];

  return (
    <footer className="px-2 pb-2 pt-6 sm:px-3 sm:pb-3 sm:pt-8">
      <div className="mx-auto max-w-[90rem] overflow-hidden rounded-[1.75rem] bg-white text-[var(--g-charcoal)]">
        {/* Desktop footer */}
        <div className="hidden px-12 pb-8 pt-12 lg:block">
          <div className="grid grid-cols-[minmax(17rem,21rem)_1fr] gap-10">
            <div className="min-w-0 border-r border-[var(--g-line)] pr-10">
              <Link href="/" className="inline-flex min-h-11 items-center">
                <ShopBrandMark logo={settings?.logo} name={brandName} />
              </Link>
              {socialLinks.length ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${social.label} (${social.handle})`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f1f1f1] transition hover:bg-[#e4e4e4]"
                    >
                      <GadgetSocialGlyph platform={social.id} className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              ) : null}
              <p className="mt-8 inline-block border-b-2 border-[var(--g-forest)] pb-1 text-[17px] font-extrabold tracking-tight">
                We’re here to help.
              </p>
              <div className="mt-4 space-y-2 text-[14px] font-bold">
                {phone ? (
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="block hover:text-[var(--g-sage)]">
                    Call us: <span className="font-extrabold">{phone}</span>
                  </a>
                ) : null}
                {email ? (
                  <a href={`mailto:${email}`} className="block hover:text-[var(--g-sage)]">
                    Email us: <span className="font-extrabold">{email}</span>
                  </a>
                ) : null}
              </div>
              <div className="mt-6">
                <GadgetFooterNewsletter />
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-0">
              {groups.map((g, i) => (
                <div
                  key={g.title}
                  className={`min-w-0 px-8 ${i > 0 ? "border-l border-[var(--g-line)]" : "pl-2"}`}
                >
                  <h2 className="inline-block border-b-2 border-[var(--g-sage)] pb-1.5 text-[14px] font-extrabold uppercase tracking-[0.06em]">
                    {g.title}
                  </h2>
                  <ul className="mt-5">
                    {g.links.map((l) => (
                      <li key={l.href + l.label}>
                        <Link
                          href={l.href}
                          className="flex min-h-[34px] items-center py-1 text-[13.5px] font-bold text-[var(--g-charcoal)] transition hover:text-[var(--g-sage)]"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 pt-8 sm:px-8 lg:hidden">
          <div className="flex flex-col items-center gap-5">
            <Link href="/" className="inline-flex min-h-11 items-center">
              <ShopBrandMark logo={settings?.logo} name={brandName} />
            </Link>
            {socialLinks.length ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${social.label} (${social.handle})`}
                    className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[#f1f1f1]"
                  >
                    <GadgetSocialGlyph platform={social.id} className="h-7 w-7" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Mobile: accordions */}
          <div className="mt-6">
            {groups.map((g) => (
              <FooterAccordion key={g.title} group={g} />
            ))}
          </div>

          {/* Help + contact */}
          <div className="mt-6 flex items-start justify-between gap-4 border-b border-[var(--g-line)] pb-5">
            <p className="text-[15px] font-extrabold tracking-tight">
              We’re here to help.
            </p>
            <div className="space-y-1.5 text-right text-[13px]">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="flex min-h-9 items-center justify-end gap-1.5 text-[var(--g-taupe)] hover:text-[var(--g-charcoal)]"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  <span className="font-semibold text-[var(--g-charcoal)]">
                    {phone}
                  </span>
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="flex min-h-9 items-center justify-end gap-1.5 text-[var(--g-taupe)] hover:text-[var(--g-charcoal)]"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  <span className="font-semibold text-[var(--g-charcoal)]">
                    {email}
                  </span>
                </a>
              ) : null}
            </div>
          </div>

          {/* Mobile newsletter */}
          <div className="mt-5">
            <GadgetFooterNewsletter />
          </div>
        </div>

        <div className="border-t border-[var(--g-line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-[var(--g-taupe)]">
            <p>
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </p>
            <nav
              aria-label="Legal"
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              {[
                ["/privacy-policy", "Privacy"],
                ["/cookies", "Cookies"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-10 items-center hover:text-[var(--g-charcoal)]"
                >
                  {label}
                </Link>
              ))}
              <CookieSettingsButton className="min-h-10 hover:text-[var(--g-charcoal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--g-forest)]" />
              {[
                ["/terms-of-service", "Terms"],
                ["/about", "About"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-10 items-center hover:text-[var(--g-charcoal)]"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
