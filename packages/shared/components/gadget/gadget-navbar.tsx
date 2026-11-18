"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Search as SearchIcon } from "lucide-react";
import {
  CaretDown,
  CaretRight,
  Headphones,
  Heart,
  List,
  Package,
  Phone,
  Question,
  ShoppingBag,
  Truck,
  X,
} from "@phosphor-icons/react";

import { StorefrontLink as Link } from "@/components/navigation/storefront-link";

import { useCart } from "@/components/cart/cart-provider";
import {
  PHOSPHOR_HEADER,
  PHOSPHOR_SEARCH,
} from "@/components/icons/phosphor-chrome";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { GadgetSearchInput } from "@/components/gadget/gadget-search-input";
import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";
import { gadgetShopTypeLinks, products2Href } from "@/lib/gadget-preview";
import { resolveCategoryImagePath } from "@/lib/category-image-resolve";
import { categoryImageUrl } from "@/lib/site-static-image";
import { ShopBrandMark } from "@/components/brand/shop-brand-mark";
import { SHOPPER_BRAND } from "@/lib/brand";
import {
  DEFAULT_HELP_LINKS,
  DEFAULT_NAV_LINKS,
  resolveChromeLinks,
} from "@/lib/chrome-nav-rules";
import type { SiteSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

function helpIcon(href: string) {
  if (href.startsWith("/track")) return Package;
  if (href.startsWith("/shipping")) return Truck;
  if (href.startsWith("/faq")) return Question;
  if (href.startsWith("/contact")) return Headphones;
  return Question;
}

function IconHit({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1] text-[var(--g-forest)] transition-colors",
        "hover:bg-[var(--g-forest)] hover:text-white",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--g-forest)]",
        className,
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
  const [universeOpen, setUniverseOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const links = gadgetShopTypeLinks(shopTypes);
  const brandName = settings?.brandName?.trim() || SHOPPER_BRAND.spokenName;
  const tagline = settings?.tagline?.trim() || SHOPPER_BRAND.tagline;
  const phone = settings?.phone;
  const navLinks = resolveChromeLinks(settings?.navLinks, DEFAULT_NAV_LINKS);
  const helpLinks = resolveChromeLinks(settings?.helpLinks, DEFAULT_HELP_LINKS);

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
    open && mounted ? (
      <div className="gadget-theme" role="presentation">
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-black/45"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <div
          className="fixed inset-y-0 left-0 z-[100] flex w-[92%] max-w-sm flex-col overflow-y-auto overscroll-contain rounded-r-[1.5rem] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--g-line)] px-5 py-4">
            <ShopBrandMark logo={settings?.logo} name={brandName} compact />
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--g-forest)] hover:bg-[#f1f1f1]"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X size={20} weight="regular" aria-hidden />
            </button>
          </div>

          <div className="px-4 pt-5">
            <form action={products2Href()} method="get" className="mb-5">
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

            <button
              type="button"
              onClick={() => setUniverseOpen((v) => !v)}
              aria-expanded={universeOpen}
              className="mb-3 flex min-h-11 w-full items-center justify-between text-left"
            >
              <span className="login-gradient-text text-xl">Shop by category</span>
              <CaretDown
                size={18}
                weight="bold"
                className={cn(
                  "text-[var(--g-charcoal)] transition-transform",
                  universeOpen ? "rotate-180" : "",
                )}
                aria-hidden
              />
            </button>

            {universeOpen ? (
              <nav className="grid gap-2" aria-label="Mobile shop">
                <Link
                  href={products2Href()}
                  onClick={() => setOpen(false)}
                  className="login-row"
                >
                  <span>{settings?.navShopAllText?.trim() || "All products"}</span>
                  <CaretRight size={16} weight="bold" aria-hidden />
                </Link>
                {links.map((link) => {
                  const path = resolveCategoryImagePath(link.imageUrl, link.slug);
                  const img = path ? categoryImageUrl(path, 128) : undefined;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="login-row"
                    >
                      <span className="min-w-0 flex-1 truncate">{link.label}</span>
                      {img ? (
                        <span className="relative h-11 w-14 shrink-0">
                          <Image
                            src={img}
                            alt=""
                            fill
                            sizes="56px"
                            quality={80}
                            className="object-contain"
                          />
                        </span>
                      ) : null}
                      <CaretRight size={16} weight="bold" aria-hidden />
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          {navLinks.length ? (
            <nav className="mt-6 grid gap-2 px-4" aria-label="Mobile explore">
              <p className="gadget-eyebrow mb-1">Explore</p>
              {navLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="login-row"
                >
                  <span>{link.label}</span>
                  <CaretRight size={16} weight="bold" aria-hidden />
                </Link>
              ))}
            </nav>
          ) : null}

          {helpLinks.length ? (
            <nav className="mt-6 grid gap-2 px-4" aria-label="Mobile help">
              <p className="gadget-eyebrow mb-1">Help</p>
              {helpLinks.map((link) => {
                const Icon = helpIcon(link.href);
                return (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="login-row justify-start"
                  >
                    <Icon
                      {...PHOSPHOR_HEADER}
                      className="text-[var(--g-sage)]"
                      aria-hidden
                    />
                    <span className="flex-1">{link.label}</span>
                    <CaretRight size={16} weight="bold" aria-hidden />
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {phone ? (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="mx-4 mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--g-forest)] px-4 text-sm font-semibold text-white"
            >
              <Phone {...PHOSPHOR_HEADER} aria-hidden />
              Call {phone}
            </a>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <header
      className="sticky top-0 z-40 text-[var(--g-charcoal)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
      style={{ paddingTop: "var(--g-safe-top)" }}
    >
      <div className="gadget-topbar-premium hidden text-[var(--g-cream)] md:block">
        <div className="mx-auto flex h-8 max-w-[90rem] items-center justify-between gap-6 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] xl:px-8">
          <p className="min-w-0 truncate">
            <span className="text-[var(--g-cream)]">{tagline}</span>
            <span className="mx-2.5 text-white/70">·</span>
            <span className="text-[var(--g-cream)]">
              {settings?.topbarAccent?.trim() || "Cash on delivery"}
            </span>
          </p>
          <nav
            className="flex shrink-0 items-center gap-4 text-[var(--g-cream)]"
            aria-label="Help"
          >
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="transition hover:text-[var(--g-cream)]"
              >
                {phone}
              </a>
            ) : null}
            {helpLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="transition hover:text-[var(--g-cream)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="px-2 pt-2 sm:px-3 md:pt-3">
      <div className="gadget-main-nav mx-auto max-w-[90rem]">
        <div className="grid h-14 grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-2 sm:h-16 sm:px-4 lg:flex lg:h-[4.25rem] lg:gap-6 lg:px-6 xl:px-8">
          <IconHit
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden"
          >
            <List size={20} weight="regular" aria-hidden />
          </IconHit>
          <Link
            href="/"
            className="group flex min-h-11 shrink-0 items-center justify-self-center lg:justify-self-auto"
          >
            <ShopBrandMark
              logo={settings?.logo}
              name={brandName}
              compact
              className="sm:hidden"
            />
            <ShopBrandMark
              logo={settings?.logo}
              name={brandName}
              className="hidden sm:inline-flex"
            />
          </Link>

          <nav aria-label="Primary" className="hidden items-center lg:flex">
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
                <CaretDown
                  {...PHOSPHOR_SEARCH}
                  className={`text-[var(--g-sage)] transition ${shopOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {shopOpen ? (
                <div className="absolute left-0 top-full z-50 w-60 overflow-hidden border border-[var(--g-line)] bg-[var(--g-cream)] p-1.5">
                  <Link
                    href={products2Href()}
                    className="flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-forest)] hover:bg-[color-mix(in_srgb,var(--g-sage)_12%,var(--g-cream))]"
                    onClick={() => setShopOpen(false)}
                  >
                    <span>{settings?.navShopAllText?.trim() || "All products"}</span>
                    <span className="text-[var(--g-gold)]">→</span>
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

            {navLinks.map((link) => (
              <Link
                key={link.href + link.label}
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
            className="ml-auto hidden min-w-0 w-full max-w-[18rem] lg:block"
          >
            <label className="sr-only" htmlFor="gadget-search">
              Search products
            </label>
            <GadgetSearchInput
              id="gadget-search"
              placeholder="Search the shop"
            />
          </form>

          <div className={cn("flex items-center gap-1.5", "lg:ml-0 ml-auto")}>
            <Link
              href="/search"
              aria-label="Search products"
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1] text-[var(--g-forest)] transition-colors hover:bg-[var(--g-forest)] hover:text-white lg:hidden"
            >
              <SearchIcon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
            </Link>

            <Link
              href="/wishlist"
              aria-label={
                wishCount ? `Wishlist, ${wishCount} items` : "Wishlist"
              }
              title="Wishlist"
              className="relative hidden h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1] text-[var(--g-forest)] transition-colors hover:bg-[var(--g-forest)] hover:text-white sm:inline-flex"
            >
              <Heart {...PHOSPHOR_HEADER} aria-hidden />
              {wishCount > 0 ? (
                <span className="gadget-sale-badge absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                  {wishCount}
                </span>
              ) : null}
            </Link>

            <IconHit
              onClick={openCart}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag size={18} weight="regular" aria-hidden />
              {count > 0 ? (
                <span className="gadget-sale-badge absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                  {count}
                </span>
              ) : null}
            </IconHit>
          </div>
        </div>
      </div>
      </div>
      {menu && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </header>
  );
}
