"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  GitCompareArrows,
  Heart,
  Headphones,
  HelpCircle,
  Menu,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { GadgetSearchInput } from "@/components/gadget/gadget-search-input";
import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import { gadgetShopTypeLinks, products2Href } from "@/lib/gadget-preview";
import { imageUrl } from "@/lib/sanity/image";
import type { SiteSettings } from "@/lib/types";

const PRIMARY_LINKS = [
  { label: "All Products", href: products2Href() },
  { label: "Offers", href: `${products2Href()}?sort=featured` },
  { label: "Blog", href: "/blog" },
  { label: "Warranty", href: "/warranty" },
  { label: "Contact", href: "/contact" },
];

const HELP_LINKS = [
  { label: "Track order", href: "/track", icon: Package },
  { label: "Shipping & returns", href: "/shipping-returns", icon: Truck },
  { label: "FAQs", href: "/faq", icon: HelpCircle },
  { label: "Support", href: "/contact", icon: Headphones },
];

export function GadgetNavbar({
  settings,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  settings: SiteSettings | null;
  shopTypes?: ShopType[];
}) {
  const { count, openCart } = useCart();
  const { count: wishCount } = useWishlist();
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const links = gadgetShopTypeLinks(shopTypes);
  const brandName = settings?.brandName || "Accessories Hub";
  const logoUrl = settings?.logo ? imageUrl(settings.logo, { w: 256 }) : undefined;
  const phone = settings?.phone;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const menu =
    open && mounted
      ? createPortal(
          <div className="gadget-theme lg:hidden" role="presentation">
            <button
              type="button"
              className="fixed inset-0 z-[90] bg-black/40"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col overflow-y-auto overscroll-contain bg-[var(--g-cream)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-[-16px_0_40px_rgba(31,54,38,0.15)] border-l border-[var(--g-line)]"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="gadget-display text-lg font-semibold tracking-[-0.02em] text-[var(--g-charcoal)]">
                  Menu
                </p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--g-cream-deep)]"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form action={products2Href()} method="get" className="mb-4">
                <label className="sr-only" htmlFor="gadget-search-mobile">
                  Search products
                </label>
                <GadgetSearchInput
                  id="gadget-search-mobile"
                  size="lg"
                  showSubmit
                  placeholder="Search gadgets, brands…"
                />
              </form>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
                Shop
              </p>
              <nav className="mb-4 grid gap-0.5" aria-label="Mobile shop">
                <Link
                  href={products2Href()}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center text-sm font-semibold text-[var(--g-charcoal)]"
                >
                  All products
                </Link>
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center text-sm font-medium text-[var(--g-taupe)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
                Explore
              </p>
              <nav className="mb-4 grid gap-0.5" aria-label="Mobile explore">
                {PRIMARY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center text-sm font-medium text-[var(--g-charcoal)]"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/compare"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center text-sm font-medium text-[var(--g-charcoal)]"
                >
                  Compare products
                </Link>
              </nav>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
                Help
              </p>
              <nav className="grid gap-0.5" aria-label="Mobile help">
                {HELP_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-[var(--g-charcoal)]"
                    >
                      <Icon className="h-4 w-4 text-[var(--g-forest)]" aria-hidden />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-[var(--g-forest)] px-4 text-sm font-semibold text-[var(--g-white)]"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  Call {phone}
                </a>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <header
      className="sticky top-0 z-40 text-[var(--g-charcoal)]"
      style={{ paddingTop: "var(--g-safe-top)" }}
    >
      {/* Utility bar */}
      <div className="hidden border-b border-white/10 bg-[var(--g-forest)] text-[var(--g-cream)] lg:block">
        <div className="flex h-9 items-center justify-between gap-4 px-4 text-[11px] font-medium tracking-wide lg:px-8">
          <div className="flex min-w-0 items-center gap-4 overflow-hidden">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex min-h-9 items-center gap-1.5 truncate transition hover:text-[var(--g-white)]"
              >
                <Phone className="h-3 w-3 shrink-0 text-[var(--g-sage)]" aria-hidden />
                {phone}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-white/75">
                <Phone className="h-3 w-3 text-[var(--g-sage)]" aria-hidden />
                Nationwide support
              </span>
            )}
            <span className="hidden h-3 w-px bg-white/20 lg:block" aria-hidden />
            <span className="hidden items-center gap-1.5 text-white/80 lg:inline-flex">
              <Truck className="h-3 w-3 text-[var(--g-sage)]" aria-hidden />
              Cash on delivery available
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 lg:gap-4">
            <Link href="/track" aria-label="Track your order" className="transition hover:text-[var(--g-white)]">
              Track order
            </Link>
            <Link href="/warranty" aria-label="View warranty policy" className="transition hover:text-[var(--g-white)]">
              Warranty
            </Link>
            <Link href="/contact" aria-label="Get customer support" className="transition hover:text-[var(--g-white)]">
              Help
            </Link>
            <Link href="/blog" aria-label="Read our tech blog" className="hidden transition hover:text-[var(--g-white)] lg:inline">
              Blog
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-[var(--g-line)] bg-[var(--g-cream)]/90 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:gap-5 lg:px-8">
          <Link
            href="/"
            className="group flex min-h-11 shrink-0 items-center gap-2"
            aria-label={`${brandName} home`}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brandName}
                width={120}
                height={32}
                priority
                className="h-8 w-auto object-contain transition duration-300 group-hover:opacity-90"
              />
            ) : (
              <span className="gadget-display relative text-lg font-semibold tracking-[-0.02em]">
                {brandName}
                <span
                  className="absolute -bottom-0.5 left-0 h-[2px] w-6 rounded-full bg-[var(--g-sage)] transition-all duration-300 group-hover:w-full"
                  aria-hidden
                />
              </span>
            )}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            <div
              className="relative"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button
                type="button"
                className="gadget-nav-link inline-flex min-h-11 items-center gap-1 px-3 text-sm font-semibold text-[var(--g-charcoal)]"
                aria-expanded={shopOpen}
                aria-haspopup="true"
                onClick={() => setShopOpen((v) => !v)}
              >
                Shop
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[var(--g-taupe)] transition ${shopOpen ? "rotate-180" : ""}`}
                />
              </button>
              {shopOpen ? (
                <div className="absolute left-0 top-full z-50 w-64 overflow-hidden rounded-2xl border border-[var(--g-card-border)] bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
                  <Link
                    href={products2Href()}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--g-forest)] transition hover:bg-[var(--g-cream)]"
                    onClick={() => setShopOpen(false)}
                  >
                    <span>All Products</span>
                    <span className="text-[10px] text-[var(--g-taupe)]">Browse All →</span>
                  </Link>
                  <div className="my-1.5 border-t border-[var(--g-line)]" />
                  <div className="max-h-[320px] overflow-y-auto pr-0.5">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block rounded-lg px-3.5 py-2 text-xs font-semibold text-[var(--g-charcoal)] transition hover:bg-[var(--g-cream)] hover:text-[var(--g-forest)]"
                        onClick={() => setShopOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="gadget-nav-link flex min-h-11 items-center px-3 text-sm font-medium text-[var(--g-taupe)] transition hover:text-[var(--g-charcoal)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form
            action={products2Href()}
            method="get"
            className="hidden min-w-0 flex-1 md:block md:max-w-sm xl:max-w-md"
          >
            <label className="sr-only" htmlFor="gadget-search">
              Search products
            </label>
            <GadgetSearchInput
              id="gadget-search"
              placeholder="Search gadgets, brands…"
            />
          </form>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/compare"
              aria-label="Compare products"
              className="gadget-icon-btn hidden h-11 w-11 items-center justify-center rounded-full text-[var(--g-charcoal)] sm:inline-flex"
              title="Compare"
            >
              <GitCompareArrows className="h-5 w-5" />
            </Link>
            <Link
              href={products2Href()}
              aria-label={wishCount ? `Wishlist, ${wishCount} items` : "Wishlist"}
              className="gadget-icon-btn relative hidden h-11 w-11 items-center justify-center rounded-full text-[var(--g-charcoal)] sm:inline-flex"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--g-sage)] px-1 text-[10px] font-bold text-[var(--g-white)]">
                  {wishCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/track"
              aria-label="Track order"
              className="gadget-icon-btn hidden h-11 w-11 items-center justify-center rounded-full text-[var(--g-charcoal)] lg:hidden"
              title="Track order"
            >
              <Package className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              className="gadget-icon-btn relative flex h-11 w-11 items-center justify-center rounded-full"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--g-forest)] px-1 text-[10px] font-bold text-[var(--g-white)] shadow-[0_4px_10px_rgba(31,54,38,0.3)]">
                  {count}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              className="gadget-icon-btn flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {menu}
    </header>
  );
}
