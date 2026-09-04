"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Menu,
  Search,
  X,
  Watch,
  BatteryCharging,
  Plug,
  Headphones,
  Package,
  ShoppingCart,
  User,
  Heart,
  CheckCircle2,
  Clock,
  RotateCcw,
  Truck
} from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { MegaMenu } from "@/components/layout/mega-menu";
import { FALLBACK_SHOP_TYPES, shopTypeLinks, type ShopType } from "@/lib/categories";
import { trackSearch } from "@/lib/analytics";
import { imageUrl } from "@/lib/sanity/image";
import type { SiteSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function SearchForm({
  className,
  autoFocus,
  onDone,
}: {
  className?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  return (
    <form
      action="/search"
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        const q = new FormData(e.currentTarget).get("q")?.toString().trim();
        if (q) trackSearch(q);
        onDone?.();
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        name="q"
        autoFocus={autoFocus}
        placeholder="Search products…"
        aria-label="Search products"
        className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/15"
      />
      <button
        type="submit"
        aria-label="Submit search"
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

export function Navbar({
  settings,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  settings: SiteSettings | null;
  shopTypes?: ShopType[];
}) {
  const { count, openCart } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const brandName = settings?.brandName || "Buy n Try";
  const links = shopTypeLinks(shopTypes);
  const logoUrl = settings?.logo
    ? imageUrl(settings.logo, { w: 256 })
    : undefined;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const Brand = (
    <Link
      href="/"
      className="flex min-h-11 shrink-0 items-center group"
      aria-label={`${brandName} home`}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={brandName}
          width={120}
          height={32}
          priority
          className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
        />
      ) : (
        <span className="text-xl font-bold tracking-tight text-foreground">
          {brandName}
        </span>
      )}
    </Link>
  );

  const CartButton = (
    <button
      onClick={openCart}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      className="relative flex flex-col items-center gap-0.5 group"
    >
      <div className="relative flex items-center justify-center">
        <ShoppingCart className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 hover:bg-primary-hover text-[10px] font-bold text-primary-foreground border border-white"
          >
            {count}
          </span>
        )}
      </div>
      <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors tracking-wide hidden md:block">Cart</span>
    </button>
  );

  const MobileCartButton = (
    <button
      onClick={openCart}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-secondary active:scale-95"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-sm">
      {/* --- TOP BAR --- Desktop only */}
      <div className="hidden md:flex w-full bg-[#EAF5F4] h-10 items-center justify-between px-4 lg:px-10 text-[10px] lg:text-[11px] font-bold tracking-wide text-primary border-b border-background">
        <div className="flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Free Delivery <span className="hidden lg:inline">on orders over PKR 3,000</span>
        </div>
        <div className="flex items-center gap-4 lg:gap-10">
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 1 Year Warranty</div>
          <div className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> 7 Days Returns</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> COD Available</div>
        </div>
      </div>

      {/* --- MIDDLE BAR --- Desktop */}
      <div className="hidden md:flex h-20 w-full max-w-[1440px] mx-auto items-center px-4 lg:px-10 bg-white justify-between gap-4 lg:gap-10 border-b border-border/40">
        <div className="flex items-center justify-start shrink-0">
          {Brand}
        </div>
        <div className="flex-1 w-full max-w-2xl">
          <form action="/search" role="search" className="relative w-full flex items-center justify-between border-2 border-primary/20 rounded-lg overflow-hidden h-11 bg-white group focus-within:border-primary/50 transition-colors">
              <Search className="h-4 w-4 ml-4 text-muted-foreground group-focus-within:text-primary" />
              <input type="search" name="q" placeholder="Search for chargers, cables, hubs..." className="flex-1 h-full px-3 text-sm font-medium outline-none bg-transparent placeholder:text-muted-foreground" />
              <button type="submit" className="h-full px-6 bg-primary text-primary-foreground font-semibold flex items-center justify-center hover:bg-primary-hover transition-colors">
                <Search className="h-4 w-4" />
              </button>
          </form>
        </div>
        <div className="flex items-center gap-4 lg:gap-8 text-xs font-semibold text-foreground shrink-0 mt-1">
           <Link href="/account" className="flex flex-col items-center justify-center gap-1 group">
             <User className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
             <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors tracking-wide hidden md:block">Account</span>
           </Link>
           <Link href="/wishlist" className="flex flex-col items-center justify-center gap-1 group">
             <Heart className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
             <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors tracking-wide hidden md:block">Wishlist</span>
           </Link>
           {CartButton}
        </div>
      </div>

      {/* --- BOTTOM BAR --- Desktop */}
      <div className="hidden md:flex h-[52px] w-full max-w-[1440px] mx-auto items-center xl:px-10 px-4 lg:px-6 bg-white shadow-sm border-[0.5px] border-border/10 justify-start pb-0.5">
        <div className="relative h-[48px] w-48 lg:w-56 flex-shrink-0" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
          <button className="flex h-full w-full items-center justify-between px-3 lg:px-5 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors rounded-t-md shadow-sm border border-primary">
            <span className="flex items-center gap-2 font-bold text-xs lg:text-[13px] tracking-wide"><Menu className="w-4 h-4"/> Categories</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaOpen ? 'rotate-180':''}`} />
          </button>
          <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} shopTypes={shopTypes} />
        </div>
        
        <nav aria-label="Primary" className="flex items-center justify-center gap-4 lg:gap-6 ml-4 lg:ml-6 h-full pt-1 whitespace-nowrap overflow-hidden">
          <Link href="/products?sort=newest" className="text-xs lg:text-[13px] font-bold tracking-wide text-foreground hover:text-primary">New Arrivals</Link>
          <Link href="/products?sort=bestselling" className="text-xs lg:text-[13px] font-bold tracking-wide text-foreground hover:text-primary">Best Sellers</Link>
          <Link href="/products?tag=deals" className="text-xs lg:text-[13px] font-bold tracking-wide text-foreground hover:text-primary">Deals</Link>
          <Link href="/contact" className="text-xs lg:text-[13px] font-bold tracking-wide text-foreground hover:text-primary">Support</Link>
        </nav>
      </div>

      {/* Mobile row */}
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>

        {Brand}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Toggle search"
            aria-expanded={mobileSearchOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
          >
            <Search className="h-5 w-5 text-foreground" />
          </button>
          {MobileCartButton}
        </div>
      </div>

      {/* Mobile inline search row */}
      {mobileSearchOpen && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <SearchForm autoFocus />
        </div>
      )}

      {/* Full-screen mobile nav drawer */}
      {drawerOpen && (
        <div
          id="mobile-nav-drawer"
          ref={drawerRef}
          className="fixed inset-0 z-50 flex flex-col bg-card md:hidden animate-in fade-in slide-in-from-left-4 duration-200"
        >
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
            {Brand}
            <div className="ml-auto">{MobileCartButton}</div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
            <SearchForm onDone={() => setDrawerOpen(false)} className="mb-6" />

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Shop by category
            </p>
            <nav
              aria-label="Categories"
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {links.map((link) => {
                const cat = link.href.split("/").pop()!;
                const CATEGORY_ICONS: Record<string, React.ElementType> = {
                  smartwatch: Watch,
                  "power-bank": BatteryCharging,
                  charger: Plug,
                  earbuds: Headphones,
                };
                const Icon = CATEGORY_ICONS[cat] || Package;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Explore
            </p>
            <nav
              aria-label="Pages"
              className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border"
            >
              {PAGE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {link.label}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>

            {(settings?.email || settings?.phone) && (
              <div className="mt-8 space-y-1 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
                {settings?.email && <p>{settings.email}</p>}
                {settings?.phone && <p>{settings.phone}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}