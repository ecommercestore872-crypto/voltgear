import Link from "next/link";
import { SHOPPER_BRAND } from "@/lib/brand";
import type { ShopType } from "@/lib/categories";
import { products2Href } from "@/lib/gadget-preview";

export function StoreV2Footer({ shopTypes }: { shopTypes: ShopType[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="sv2-footer">
      <div className="sv2-container sv2-footer-grid">
        <div className="sv2-footer-brand">
          <Link className="sv2-footer-logo" href="/beta">
            Buy n <span>Try</span>
          </Link>
          <p>
            Premium mobile accessories for Pakistan. Cash on delivery, honest specs, and support you
            can reach.
          </p>
        </div>
        <div className="sv2-footer-col">
          <h3>Shop</h3>
          <ul>
            <li>
              <Link href={products2Href()}>All products</Link>
            </li>
            {shopTypes.slice(0, 4).map((t) => (
              <li key={t.slug}>
                <Link href={t.href ?? `/products/${t.slug}`}>{t.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/bulk-order">Bulk order</Link>
            </li>
          </ul>
        </div>
        <div className="sv2-footer-col">
          <h3>Help</h3>
          <ul>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/shipping-returns">Shipping &amp; returns</Link>
            </li>
            <li>
              <Link href="/track">Track order</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div className="sv2-footer-col">
          <h3>Account</h3>
          <ul>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
            <li>
              <Link href="/wishlist">Wishlist</Link>
            </li>
            <li>
              <Link href="/compare">Compare</Link>
            </li>
          </ul>
        </div>
        <div className="sv2-footer-col">
          <h3>Legal</h3>
          <ul>
            <li>
              <Link href="/privacy-policy">Privacy policy</Link>
            </li>
            <li>
              <Link href="/terms-of-service">Terms of service</Link>
            </li>
            <li>
              <Link href="/about">About us</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="sv2-footer-bottom">
        © {year} {SHOPPER_BRAND.spokenName}. All rights reserved.
      </p>
    </footer>
  );
}
