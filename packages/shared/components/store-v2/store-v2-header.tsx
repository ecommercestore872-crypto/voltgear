"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/components/cart/cart-provider";
import type { ShopType } from "@/lib/categories";
import { products2Href } from "@/lib/gadget-preview";
export function StoreV2UtilityBar() {
  return (
    <div className="sv2-utility">
      <div className="sv2-container sv2-utility-inner">
        <span>
          <Link href="/contact">Support</Link> · <Link href="/track">Track order</Link>
        </span>
        <span className="sv2-utility-promo">
          <em>Free COD</em> · PostEx tracking
        </span>
        <span>PK · English</span>
      </div>
    </div>
  );
}

export function StoreV2Header({ shopTypes }: { shopTypes: ShopType[] }) {
  const router = useRouter();
  const { openCart, items } = useCart();
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const subLinks = [
    { href: products2Href(), label: "Shop all", hot: true },
    ...shopTypes.slice(0, 5).map((t) => ({
      href: t.href ?? `/products/${t.slug}`,
      label: t.label,
      hot: false,
    })),
    { href: "/collections/featured", label: "Collections", hot: false },
    { href: "/cod/lahore", label: "COD cities", hot: false },
    { href: "/blog", label: "Journal", hot: false },
    { href: "/contact", label: "Help", hot: false },
  ];

  return (
    <header className={`sv2-header${scrolled ? " is-scrolled" : ""}`} id="sv2-site-header">
      <div className="sv2-header-rail" aria-hidden="true" />
      <div className="sv2-container sv2-header-inner">
        <Link href="/products" className="sv2-header-menu" aria-label="Browse catalog">
          ☰
        </Link>
        <Link href={products2Href()} className="sv2-header-cat-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          Categories
        </Link>
        <Link className="sv2-header-logo" href="/beta">
          Buy n <span>Try</span>
        </Link>
        <form className="sv2-header-search" role="search" onSubmit={onSearch}>
          <label className="sr-only" htmlFor="sv2-header-search">
            Search products
          </label>
          <select className="sv2-header-search-cat" aria-label="Search category" defaultValue="all">
            <option value="all">All</option>
            {shopTypes.slice(0, 3).map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="sv2-header-search-divider" aria-hidden="true" />
          <input
            id="sv2-header-search"
            className="sv2-header-search-input"
            type="search"
            placeholder="Search earbuds, chargers…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="sv2-header-search-btn">
            Search
          </button>
        </form>
        <nav className="sv2-header-quick" aria-label="Account shortcuts">
          <Link href="/track">Track</Link>
          <Link href="/wishlist">Saved</Link>
        </nav>
        <button
          type="button"
          className={`sv2-header-cart${count > 0 ? " has-badge" : ""}`}
          aria-label={count ? `Cart, ${count} items` : "Cart"}
          onClick={openCart}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6h15l-1.5 9h-12z" />
            <circle cx="9" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
            <path d="M6 6L5 3H2" />
          </svg>
          <span className="sv2-header-cart-label">Cart</span>
          {count > 0 ? <span className="sv2-header-cart-count">{count > 9 ? "9+" : count}</span> : null}
        </button>
      </div>
      <nav className="sv2-subnav" aria-label="Shop departments">
        <div className="sv2-container sv2-subnav-inner">
          {subLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={link.hot ? "is-hot" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
