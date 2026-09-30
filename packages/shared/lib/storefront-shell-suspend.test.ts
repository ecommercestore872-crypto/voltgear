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
});
