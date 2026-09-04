"use client";

import Link from "next/link";
import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
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
import { BntWordmark } from "@/components/brand/bnt-wordmark";
import { SHOPPER_BRAND } from "@/lib/brand";
import type { SiteSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { label: "Offers", href: `${products2Href()}?sort=featured` },
  { label: "Blog", href: "/blog" },
];

const HELP_LINKS = [
  { label: "Track order", href: "/track", icon: Package },
  { label: "Shipping & returns", href: "/shipping-returns", icon: Truck },
  { label: "FAQs", href: "/faq", icon: HelpCircle },
  { label: "Support", href: "/contact", icon: Headphones },
];

function IconHit({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-sand)] text-[var(--g-forest)] transition-colors",
        "hover:border-[var(--g-forest)] hover:bg-[var(--g-forest)] hover:text-[var(--g-cream)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--g-forest)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

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
  const brandName = SHOPPER_BRAND.spokenName;
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
          <div className="gadget-theme md:hidden" role="presentation">
            <button
              type="button"
              className="fixed inset-0 z-[90] bg-[var(--g-forest)]/35"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col overflow-y-auto overscroll-contain border-l border-[var(--g-line)] bg-[var(--g-cream)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <BntWordmark compact />
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] text-[var(--g-forest)]"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form action={products2Href()} method="get" className="mb-6">
                <label className="sr-only" htmlFor="gadget-search-mobile">
                  Search products
                </label>
                <GadgetSearchInput
                  id="gadget-search-mobile"
                  size="lg"
                  showSubmit
                  placeholder="Search the shop"
                />
              </form>

              <p className="gadget-eyebrow mb-2">Shop</p>
              <nav className="mb-6 grid border-t border-[var(--g-line)]" aria-label="Mobile shop">
                <Link
                  href={products2Href()}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center border-b border-[var(--g-line)] text-sm font-semibold text-[var(--g-forest)]"
                >
                  All products
                </Link>
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center border-b border-[var(--g-line)] text-sm text-[var(--g-charcoal)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <p className="gadget-eyebrow mb-2">Explore</p>
              <nav className="mb-6 grid border-t border-[var(--g-line)]" aria-label="Mobile explore">
                {PRIMARY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center border-b border-[var(--g-line)] text-sm text-[var(--g-charcoal)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <p className="gadget-eyebrow mb-2">Help</p>
              <nav className="grid border-t border-[var(--g-line)]" aria-label="Mobile help">
                {HELP_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center gap-2.5 border-b border-[var(--g-line)] text-sm text-[var(--g-charcoal)]"
                    >
                      <Icon className="h-4 w-4 text-[var(--g-sage)]" aria-hidden />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--g-forest)] px-4 text-sm font-semibold text-[var(--g-cream)]"
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
      <div className="hidden bg-[var(--g-forest)] text-[var(--g-cream)] md:block">
        <div className="mx-auto flex h-8 max-w-[90rem] items-center justify-between gap-6 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] xl:px-8">
          <p className="min-w-0 truncate">
            <span className="text-[color-mix(in_srgb,var(--g-terracotta)_55%,white)]">
              {SHOPPER_BRAND.tagline}
            </span>
            <span className="mx-2.5 text-white/25">·</span>
            <span className="text-[var(--g-cream)]/80">Cash on delivery</span>
          </p>
          <nav className="flex shrink-0 items-center gap-4 text-[var(--g-cream)]/80" aria-label="Help">
            {phone ? (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="transition hover:text-[var(--g-cream)]">
                {phone}
              </a>
            ) : null}
            <Link href="/track" className="transition hover:text-[var(--g-cream)]">
              Track
            </Link>
            <Link href="/warranty" className="transition hover:text-[var(--g-cream)]">
              Warranty
            </Link>
            <Link href="/contact" className="transition hover:text-[var(--g-cream)]">
              Help
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-b border-[var(--g-line)] bg-[var(--g-cream)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-3 sm:h-[4.25rem] sm:px-4 lg:gap-6 lg:px-6 xl:px-8">
          <Link
            href="/"
            className="group flex min-h-11 shrink-0 items-center"
            aria-label={`${brandName} home`}
          >
            <BntWordmark compact className="sm:hidden" />
            <BntWordmark className="hidden sm:inline-flex" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center md:flex">
            <div
              className="relative"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button
                type="button"
                className="gadget-nav-link inline-flex min-h-11 items-center gap-1 px-3 text-[13px] font-semibold tracking-[0.02em] text-[var(--g-forest)]"
                aria-expanded={shopOpen}
                aria-haspopup="true"
                onClick={() => setShopOpen((v) => !v)}
              >
                Shop
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[var(--g-sage)] transition ${shopOpen ? "rotate-180" : ""}`}
                />
              </button>
              {shopOpen ? (
                <div className="absolute left-0 top-full z-50 w-60 overflow-hidden border border-[var(--g-line)] bg-[var(--g-cream)] p-1.5">
                  <Link
                    href={products2Href()}
                    className="flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-forest)] hover:bg-[color-mix(in_srgb,var(--g-sage)_12%,var(--g-cream))]"
                    onClick={() => setShopOpen(false)}
                  >
                    <span>All products</span>
                    <span className="text-[var(--g-terracotta)]">→</span>
                  </Link>
                  <div className="mx-3 border-t border-[var(--g-line)]" />
                  <div className="max-h-[320px] overflow-y-auto">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-3 py-2 text-[13px] text-[var(--g-charcoal)] hover:bg-[color-mix(in_srgb,var(--g-sage)_12%,var(--g-cream))] hover:text-[var(--g-forest)]"
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
                className="gadget-nav-link flex min-h-11 items-center px-3 text-[13px] font-medium tracking-[0.02em] text-[var(--g-charcoal)] hover:text-[var(--g-forest)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form
            action={products2Href()}
            method="get"
            className="ml-auto hidden min-w-0 w-full max-w-[12rem] md:block lg:max-w-[18rem]"
          >
            <label className="sr-only" htmlFor="gadget-search">
              Search products
            </label>
            <GadgetSearchInput id="gadget-search" placeholder="Search the shop" />
          </form>

          <div className={cn("flex items-center gap-1.5", "md:ml-0 ml-auto")}>
            <Link
              href="/wishlist"
              aria-label={wishCount ? `Wishlist, ${wishCount} items` : "Wishlist"}
              title="Wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-sand)] text-[var(--g-forest)] transition-colors hover:border-[var(--g-forest)] hover:bg-[var(--g-forest)] hover:text-[var(--g-cream)] sm:inline-flex"
            >
              <Heart className="h-4 w-4 stroke-[1.75]" />
              {wishCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--g-terracotta)] px-1 text-[9px] font-bold text-[var(--g-cream)]">
                  {wishCount}
                </span>
              ) : null}
            </Link>

            <IconHit
              onClick={openCart}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4 stroke-[1.75]" />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--g-terracotta)] px-1 text-[9px] font-bold text-[var(--g-cream)]">
                  {count}
                </span>
              ) : null}
            </IconHit>

            <IconHit
              className="md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </IconHit>
          </div>
        </div>
      </div>
      {menu}
    </header>
  );
}
