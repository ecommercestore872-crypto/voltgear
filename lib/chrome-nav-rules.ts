export type ChromeLink = { label: string; href: string };

export const DEFAULT_NAV_LINKS: ChromeLink[] = [
  { label: "Offers", href: "/products?sort=featured" },
  { label: "Blog", href: "/blog" },
];

export const DEFAULT_HELP_LINKS: ChromeLink[] = [
  { label: "Track order", href: "/track" },
  { label: "Shipping & returns", href: "/shipping-returns" },
  { label: "FAQs", href: "/faq" },
  { label: "Support", href: "/contact" },
];

export const DEFAULT_FOOTER_COMPANY_LINKS: ChromeLink[] = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/blog", label: "Blogs" },
  { href: "/faq", label: "Customer Care" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms and Conditions" },
  { href: "/bulk-order", label: "Corporate Orders" },
  { href: "/", label: "Official Brand Outlet" },
];

export const DEFAULT_FOOTER_CARE_LINKS: ChromeLink[] = [
  { href: "/contact", label: "Register a Complaint" },
  { href: "/track", label: "Track Your Order" },
  { href: "/faq#payments", label: "Modes Of Payments" },
  { href: "/warranty", label: "Warranty Policy" },
  { href: "/shipping-returns#returns", label: "Exchange and Refund Policy" },
  { href: "/shipping-returns#shipping", label: "Shipping Policy" },
];

export function isAllowedChromeHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
}

export function parseChromeLinks(raw: unknown): ChromeLink[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  return raw.map((row) => {
    if (!row || typeof row !== "object") return { label: "", href: "" };
    const rec = row as Record<string, unknown>;
    return {
      label: typeof rec.label === "string" ? rec.label.trim() : "",
      href: typeof rec.href === "string" ? rec.href.trim() : "",
    };
  });
}

export function sanitizeChromeLinks(raw: unknown): ChromeLink[] {
  const parsed = parseChromeLinks(raw);
  if (!parsed) return [];
  return parsed.filter((row) => row.label && isAllowedChromeHref(row.href));
}

export function resolveChromeLinks(raw: unknown, fallback: ChromeLink[]): ChromeLink[] {
  if (raw == null) return fallback;
  if (!Array.isArray(raw)) return fallback;
  return sanitizeChromeLinks(raw);
}

export function validateChromeLists(input: {
  navLinks?: unknown;
  helpLinks?: unknown;
  footerCompanyLinks?: unknown;
  footerCareLinks?: unknown;
}): { ok: true } | { ok: false; error: string } {
  const groups: [unknown, string][] = [
    [input.navLinks, "Navbar"],
    [input.helpLinks, "Help"],
    [input.footerCompanyLinks, "Footer Company"],
    [input.footerCareLinks, "Footer Care"],
  ];
  for (const [raw, name] of groups) {
    if (raw == null) continue;
    if (!Array.isArray(raw)) {
      return { ok: false, error: `${name} links must be a list.` };
    }
    const submitted = raw.filter((row) => {
      if (!row || typeof row !== "object") return false;
      const rec = row as Record<string, unknown>;
      return Boolean(String(rec.label ?? "").trim() || String(rec.href ?? "").trim());
    });
    if (!submitted.length) continue;
    const clean = sanitizeChromeLinks(raw);
    if (!clean.length) {
      return { ok: false, error: `${name} links need a label and a URL starting with / or http.` };
    }
  }
  return { ok: true };
}

export function useSettingsLogo(logo?: string | null): string | null {
  const trimmed = logo?.trim() ?? "";
  return trimmed || null;
}
