"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Heart,
  LayoutGrid,
  Link2,
  List,
  MessageCircle,
  Percent,
} from "lucide-react";

import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { GadgetTrustStrip } from "@/components/gadget/gadget-trust-strip";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { products2Href } from "@/lib/gadget-preview";
import { fetchStoreProductsBySlugs } from "@/lib/store-client";
import type { Product } from "@/lib/types";
import { useSiteConfig } from "@/lib/use-site-config";
import { formatPrice } from "@/lib/utils";
import { loadWishlistRecommendations } from "@/lib/wishlist-recommendations";
import {
  normalizeWishlistSlugLookup,
  orderProductsByWishlistSlugs,
} from "@/lib/wishlist-product-fetch-rules";

const PROMO_CARD =
  "gadget-glass rounded-[22px] p-6 md:p-8 flex flex-col items-center justify-center text-center transition-all hover:shadow-[0_8px_24px_rgba(31,54,38,0.06)]";

const FILTER_ACTIVE =
  "px-4 py-1.5 rounded-xl bg-[color-mix(in_srgb,var(--g-sage)_16%,var(--g-cream))] text-[var(--g-forest)] text-[13px] font-extrabold whitespace-nowrap transition-colors";

const FILTER_IDLE =
  "px-4 py-1.5 rounded-xl text-[var(--g-taupe)] hover:bg-[var(--g-cream-deep)] hover:text-[var(--g-charcoal)] text-[13px] font-bold whitespace-nowrap transition-colors";

const BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--g-forest)] px-7 text-sm font-bold text-white shadow-[0_8px_24px_rgba(31,54,38,0.18)] transition hover:bg-[var(--g-forest-mid)]";

function WishlistGridSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-[380px] w-full rounded-[22px] bg-[var(--g-cream-deep)]"
        />
      ))}
    </>
  );
}

function WishlistTrustFooter() {
  const config = useSiteConfig();
  const threshold = Number(config.freeShippingThreshold ?? 0);
  const items = useMemo(
    () =>
      [
        {
          key: "shipping",
          title: threshold > 0 ? "Free Shipping" : "Fast Shipping",
          detail:
            threshold > 0 ? `Over ${formatPrice(threshold)}` : "Nationwide",
          icon: "shipping" as const,
          show: true,
        },
        {
          key: "cod",
          title: "Cash on Delivery",
          detail: "Pay on arrival",
          icon: "cod" as const,
          show: Boolean(config.codEnabled),
        },
        {
          key: "returns",
          title: "Easy Returns",
          detail: config.returnWindowDays
            ? `${config.returnWindowDays}-day policy`
            : "Hassle-free",
          icon: "returns" as const,
          show: true,
        },
        {
          key: "curated",
          title: "Quality Covered",
          detail: config.warrantyMonths
            ? `${config.warrantyMonths}-month warranty`
            : "Certified picks",
          icon: "curated" as const,
          show: true,
        },
      ].filter((t) => t.show),
    [config],
  );

  return (
    <div className="mt-10 border-t border-[var(--g-line)] pt-8">
      <GadgetTrustStrip items={items} />
    </div>
  );
}

export function WishlistClient() {
  const { items: wishlistItems, hydrated } = useWishlist();
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const wishlistSlugs = useMemo(
    () => normalizeWishlistSlugLookup(wishlistItems.map((i) => i.slug)),
    [wishlistItems],
  );

  const loadProducts = useCallback(async () => {
    if (!wishlistSlugs.length) {
      setSavedProducts([]);
      setRecommended([]);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const products = await fetchStoreProductsBySlugs(wishlistSlugs);
      const bySlug = new Map(products.map((p) => [p.slug, p]));
      const saved = orderProductsByWishlistSlugs(wishlistSlugs, bySlug);
      setSavedProducts(saved);

      const exclude = new Set(wishlistSlugs);
      const category =
        wishlistItems.find((i) => i.category?.trim())?.category?.trim() ??
        saved.find((p) => p.category)?.category ??
        "";
      try {
        setRecommended(await loadWishlistRecommendations(exclude, category));
      } catch {
        setRecommended([]);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [wishlistItems, wishlistSlugs]);

  useEffect(() => {
    if (!hydrated) return;
    setSavedProducts((prev) =>
      prev.filter((p) => wishlistSlugs.includes(p.slug)),
    );
  }, [wishlistSlugs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void loadProducts();
  }, [hydrated, loadProducts]);

  const showInitialSkeleton = !hydrated;
  const showLoadingGrid =
    hydrated && wishlistSlugs.length > 0 && loading && !savedProducts.length;
  const showEmpty =
    hydrated && !loading && !loadError && wishlistSlugs.length === 0;
  const showError = hydrated && loadError && wishlistSlugs.length > 0;

  return (
    <div className="min-h-screen bg-[var(--g-cream)] text-[var(--g-charcoal)] pb-16">
      <div className="relative overflow-hidden border-b border-[var(--g-line)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--g-sage)_22%,transparent),transparent_55%),linear-gradient(180deg,var(--g-cream-deep),var(--g-cream))]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-5 sm:py-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="text-[11px] font-medium tracking-wide text-[var(--g-taupe)] sm:text-xs"
          >
            <Link
              href="/"
              className="transition hover:text-[var(--g-forest)]"
            >
              Home
            </Link>
            <span className="px-1.5 text-[var(--g-line)]">/</span>
            <span className="text-[var(--g-charcoal)]">Wishlist</span>
          </nav>

          <div className="mt-3 flex flex-col gap-4 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="gadget-eyebrow">Saved for later</p>
              <h1 className="gadget-h2 mt-1 text-2xl sm:text-3xl">
                My Wishlist
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--g-taupe)] sm:text-[15px]">
                Saved items you can review anytime.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[color-mix(in_srgb,var(--g-blush)_55%,white)] px-4 py-2 shadow-[0_4px_16px_rgba(31,54,38,0.06)]">
              <Heart className="h-4 w-4 fill-[var(--g-forest)] text-[var(--g-forest)]" />
              <span className="text-[13px] font-bold text-[var(--g-forest)]">
                {hydrated ? savedProducts.length : "—"} saved items
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-10 pt-3 sm:pb-12 sm:pt-4 lg:px-8">
        <div className="gadget-glass flex flex-col items-center justify-between gap-4 rounded-2xl p-3 md:flex-row">
          <div className="flex w-full items-center gap-1 overflow-x-auto no-scrollbar md:w-auto">
            <button type="button" className={FILTER_ACTIVE}>
              All Items ({hydrated ? savedProducts.length : "—"})
            </button>
            <button type="button" className={FILTER_IDLE}>
              In Stock (
              {
                savedProducts.filter((p) => p.stockStatus !== "out-of-stock")
                  .length
              }
              )
            </button>
            <button type="button" className={FILTER_IDLE}>
              Price Drop (1)
            </button>
            <button type="button" className={FILTER_IDLE}>
              Recently Added
            </button>
          </div>

          <div className="flex w-full items-center justify-between gap-4 border-t border-[var(--g-line)] pt-3 md:w-auto md:justify-end md:border-t-0 md:pt-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[var(--g-taupe)]">
                Sort by:
              </span>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[var(--g-line)] bg-[var(--g-white)]/80 px-3 py-1.5 text-[13px] font-bold text-[var(--g-charcoal)] shadow-sm outline-none transition-colors hover:bg-[var(--g-cream-deep)]"
              >
                Recently Added{" "}
                <ChevronDown className="h-4 w-4 text-[var(--g-taupe)]" />
              </button>
            </div>
            <div className="flex items-center rounded-xl border border-[var(--g-line)] bg-[var(--g-cream-deep)]/80 p-1">
              <button
                type="button"
                className="rounded-lg border border-[var(--g-line)] bg-[var(--g-white)] p-1.5 text-[var(--g-forest)] shadow-sm"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--g-taupe)] transition-colors hover:text-[var(--g-charcoal)]"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {showError ? (
          <div className="gadget-glass col-span-full flex flex-col items-center justify-center py-16 text-center">
            <p className="font-bold text-[var(--g-charcoal)]">
              We couldn&apos;t load your wishlist right now.
            </p>
            <button
              type="button"
              onClick={() => void loadProducts()}
              className={`mt-4 ${BTN_PRIMARY}`}
            >
              Try again
            </button>
          </div>
        ) : null}

        <div className="gadget-product-grid">
          {showInitialSkeleton || showLoadingGrid ? (
            <WishlistGridSkeleton />
          ) : null}

          {showEmpty ? (
            <div className="gadget-glass col-span-full flex flex-col items-center justify-center py-20 text-center">
              <Heart className="mb-4 h-12 w-12 text-[var(--g-line)]" />
              <h3 className="text-xl font-bold text-[var(--g-charcoal)]">
                Your wishlist is empty
              </h3>
              <p className="mt-2 font-medium text-[var(--g-taupe)]">
                Explore our catalog and save your favorite items here.
              </p>
              <Link href={products2Href()} className={`mt-6 ${BTN_PRIMARY}`}>
                Browse Products
              </Link>
            </div>
          ) : null}

          {!showInitialSkeleton &&
          !showLoadingGrid &&
          !showEmpty &&
          !showError &&
          savedProducts.length > 0 ? (
            <>
              {savedProducts.slice(0, 3).map((p) => (
                <div key={p.slug} className="h-full">
                  <GadgetProductCard product={p} />
                </div>
              ))}

              {(savedProducts.length >= 1 || true) && (
                <div className={PROMO_CARD}>
                  <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[color-mix(in_srgb,var(--g-sage)_16%,var(--g-cream))] shadow-[inset_0_2px_6px_rgba(31,54,38,0.08)]">
                    <Percent
                      className="h-7 w-7 text-[var(--g-forest)]"
                      strokeWidth={2.5}
                    />
                    <div className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[var(--g-terracotta)]" />
                  </div>
                  <h3 className="mb-2 text-[17px] font-extrabold leading-tight tracking-tight text-[var(--g-charcoal)]">
                    Price-drop alerts enabled
                  </h3>
                  <p className="balance mb-6 max-w-[220px] text-[13px] font-medium leading-relaxed text-[var(--g-taupe)]">
                    We&apos;ll notify you when the price drops on items in your
                    wishlist.
                  </p>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-[var(--g-line)] py-2.5 text-[13px] font-bold text-[var(--g-charcoal)] shadow-sm transition-colors hover:bg-[var(--g-cream-deep)]"
                  >
                    Manage Alerts
                  </button>
                </div>
              )}

              {savedProducts.slice(3, 7).map((p) => (
                <div key={p.slug} className="h-full">
                  <GadgetProductCard product={p} />
                </div>
              ))}

              {(savedProducts.length >= 3 || true) && (
                <div className={PROMO_CARD}>
                  <h3 className="mb-2 mt-2 text-[17px] font-extrabold leading-tight tracking-tight text-[var(--g-charcoal)]">
                    Share your wishlist
                  </h3>
                  <p className="balance mb-6 max-w-[220px] text-[13px] font-medium leading-relaxed text-[var(--g-taupe)]">
                    Give friends hints or inspire someone special.
                  </p>

                  <div className="mb-6 flex items-center gap-3">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--g-sage)_16%,var(--g-cream))] text-[var(--g-forest)] shadow-sm transition-colors hover:bg-[var(--g-forest)] hover:text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--g-sage)_12%,var(--g-cream-deep))] text-[var(--g-forest-mid)] shadow-sm transition-colors hover:bg-[var(--g-forest)] hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--g-cream-deep)] text-[var(--g-taupe)] shadow-sm transition-colors hover:bg-[var(--g-forest)] hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-taupe)] shadow-sm transition-colors hover:bg-[var(--g-charcoal)] hover:text-white"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-xl border border-[var(--g-forest)] py-2.5 text-[13px] font-bold text-[var(--g-forest)] shadow-sm transition-colors hover:bg-[color-mix(in_srgb,var(--g-sage)_16%,var(--g-cream))]"
                  >
                    Copy Wishlist Link
                  </button>
                </div>
              )}

              {savedProducts.slice(7).map((p) => (
                <div key={p.slug} className="h-full">
                  <GadgetProductCard product={p} />
                </div>
              ))}
            </>
          ) : null}
        </div>

        {recommended.length > 0 ? (
          <div className="mt-12 border-t border-[var(--g-line)] pt-12">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-[var(--g-charcoal)] sm:text-3xl">
              You may also{" "}
              <span className="relative inline-block">
                like
                <span
                  className="absolute -bottom-1 left-0 h-[2.5px] w-full rounded-full bg-[var(--g-amber)]"
                  aria-hidden
                />
              </span>
            </h2>
            <div className="gadget-product-grid">
              {recommended.map((p) => (
                <div key={p.slug} className="h-full">
                  <GadgetProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <WishlistTrustFooter />
      </div>
    </div>
  );
}
