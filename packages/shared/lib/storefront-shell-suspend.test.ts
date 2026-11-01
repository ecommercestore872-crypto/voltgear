import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const sharedRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readShared(relativePath: string): string {
  return readFileSync(join(sharedRoot, relativePath), "utf8");
}

describe("storefront shell must not suspend on ad query strings", () => {
  it("AppChrome does not import useSearchParams", () => {
    const src = readShared("components/layout/app-chrome.tsx");
    assert.doesNotMatch(src, /useSearchParams/);
  });

  it("CartDrawer does not import useSearchParams", () => {
    const src = readShared("components/cart/cart-drawer.tsx");
    assert.doesNotMatch(src, /useSearchParams/);
  });

  it("GadgetShopCatalogClient does not import useSearchParams", () => {
    const src = readShared("components/gadget/gadget-shop-catalog-client.tsx");
    assert.doesNotMatch(src, /useSearchParams/);
  });

  it("search page does not use server searchParams (ISR shell)", () => {
    const pagePath = join(sharedRoot, "../../apps/storefront/app/search/page.tsx");
    const src = readFileSync(pagePath, "utf8");
    assert.doesNotMatch(src, /searchParams/);
  });

  it("PDP page uses server LCP hero slot", () => {
    const pagePath = join(
      sharedRoot,
      "../../apps/storefront/app/product/[slug]/page.tsx",
    );
    const src = readFileSync(pagePath, "utf8");
    assert.match(src, /GadgetPdpServerHero/);
    assert.match(src, /GadgetPdpProductGrid/);
  });

  it("root layout does not wrap AppChrome in Suspense", () => {
    const layoutPath = join(
      sharedRoot,
      "../../apps/storefront/app/layout.tsx",
    );
    const src = readFileSync(layoutPath, "utf8");
    assert.doesNotMatch(
      src,
      /<Suspense[\s\S]*<AppChrome/,
      "Suspense around AppChrome recreates footer-first empty main on ?ttclid= links",
    );
  });

  it("checkout page stays a server entry and does not disable SSR", () => {
    const pagePath = join(
      sharedRoot,
      "../../apps/storefront/app/checkout/page.tsx",
    );
    const src = readFileSync(pagePath, "utf8");
    assert.doesNotMatch(src, /^\s*["']use client["']/);
    assert.doesNotMatch(src, /ssr\s*:\s*false/);
    assert.match(src, /CheckoutPageGate/);
    assert.doesNotMatch(src, /CheckoutStaticShell/);

    const intro = readShared("components/checkout/checkout-intro-header.tsx");
    assert.match(intro, /Checkout/);
    assert.match(intro, /Cash on delivery/i);
  });

  it("checkout reserves layout space until local cart state is hydrated", () => {
    const src = readShared("components/checkout/checkout-page-gate.tsx");
    assert.match(src, /if \(!hydrated\)/);
    assert.match(src, /<CheckoutHydrationFallback\s*\/>/);
    assert.match(src, /dynamic\(/);
    assert.match(src, /items\.length === 0/);

    const fallback = readShared(
      "components/checkout/checkout-hydration-fallback.tsx",
    );
    assert.match(fallback, /min-h-\[calc\(100dvh-10rem\)\]/);
    assert.match(fallback, /aria-busy="true"/);
  });

  it("optional marketing scripts require explicit cookie consent", () => {
    const layoutPath = join(
      sharedRoot,
      "../../apps/storefront/app/layout.tsx",
    );
    const layout = readFileSync(layoutPath, "utf8");
    const meta = readShared("components/analytics/meta-pixel.tsx");
    const adsense = readShared("components/ads/adsense-loader.tsx");
    const clarity = readShared("components/analytics/clarity-deferred.tsx");

    assert.doesNotMatch(layout, /setTimeout\(load,\s*9000\)/);
    assert.match(layout, /<AdSenseLoaderClientOnly/);
    assert.match(meta, /consent !== "all"/);
    assert.match(adsense, /consent !== "all"/);
    assert.match(clarity, /consent !== "all"/);
  });

  it("shopper links avoid speculative route downloads by default", () => {
    const link = readShared("components/navigation/storefront-link.tsx");
    const gadgetNavbar = readShared("components/gadget/gadget-navbar.tsx");
    const gadgetFooter = readShared("components/gadget/gadget-footer.tsx");

    assert.match(link, /prefetch = false/);
    assert.match(link, /<NextLink prefetch=\{prefetch\}/);
    assert.match(gadgetNavbar, /StorefrontLink as Link/);
    assert.match(gadgetFooter, /StorefrontLink as Link/);
  });

  it("keeps audited storefront controls accessible", () => {
    const navbar = readShared("components/layout/navbar.tsx");
    const footer = readShared("components/layout/footer.tsx");
    const card = readShared("components/gadget/gadget-arrival-card.tsx");
    const reviews = readShared("components/gadget/gadget-reviews-slider.tsx");
    const hero = readShared("components/gadget/gadget-hero-slider.tsx");

    assert.match(navbar, /aria-label=\{`Open cart,/);
    assert.doesNotMatch(footer, /<h3 className="mb-(?:3|4) text-\[11px\]/);
    assert.match(card, /Add to cart: \$\{product\.name\}/);
    assert.match(reviews, /className="flex h-8 min-w-8/);
    assert.match(hero, /className="relative flex h-8 min-w-8/);
  });
});
