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

  it("checkout keeps a server-rendered shell and does not disable SSR", () => {
    const pagePath = join(
      sharedRoot,
      "../../apps/storefront/app/checkout/page.tsx",
    );
    const src = readFileSync(pagePath, "utf8");
    assert.doesNotMatch(src, /^\s*["']use client["']/);
    assert.doesNotMatch(src, /ssr\s*:\s*false/);
    assert.match(src, /<CheckoutStaticShell\s*\/>/);
    assert.match(src, /<CheckoutPageClient\s*\/>/);

    const shell = readShared("components/checkout/checkout-static-shell.tsx");
    assert.doesNotMatch(shell, /premium-royal-header-band premium-royal-enter/);
    assert.match(shell, /Secure cash on delivery checkout/);
  });

  it("checkout reserves layout space until local cart state is hydrated", () => {
    const clientPath = join(
      sharedRoot,
      "components/checkout/checkout-page-client.tsx",
    );
    const src = readFileSync(clientPath, "utf8");
    assert.match(src, /if \(!hydrated\)/);
    assert.match(src, /<CheckoutHydrationFallback\s*\/>/);

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

    assert.doesNotMatch(layout, /setTimeout\(load,\s*9000\)/);
    assert.match(layout, /<AdSenseLoaderClientOnly/);
    assert.match(meta, /consent !== "all"/);
    assert.match(adsense, /consent !== "all"/);
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
