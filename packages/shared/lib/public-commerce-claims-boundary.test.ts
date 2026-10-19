import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("public commerce claim boundaries", () => {
  it("uses configured shipping thresholds in the shared navigation", () => {
    const navbar = source("packages/shared/components/layout/navbar.tsx");

    assert.match(navbar, /normalizeSettings\(settings\)/);
    assert.match(navbar, /formatPrice\(config\.freeShippingThreshold\)/);
    assert.doesNotMatch(navbar, /PKR 3,000/);
  });

  it("does not invent warranty or return durations when settings are absent", () => {
    const paths = [
      "packages/shared/components/layout/navbar.tsx",
      "packages/shared/components/catalog/catalog-view.tsx",
      "packages/shared/components/checkout/checkout-page-client.tsx",
      "packages/shared/components/checkout/checkout-desktop-sidebar.tsx",
      "packages/shared/components/gadget/gadget-footer.tsx",
      "packages/shared/components/product/purchase-section.tsx",
      "apps/storefront/app/order/[id]/page.tsx",
    ];
    const publicSources = paths.map(source).join("\n");

    assert.doesNotMatch(publicSources, /1 Year Warranty/i);
    assert.doesNotMatch(publicSources, /7 Days Returns/i);
    assert.doesNotMatch(publicSources, /7 days easy returns/i);
    assert.doesNotMatch(publicSources, /warrantyMonths\s*(?:\|\||\?\?)\s*12/);
    assert.doesNotMatch(publicSources, /returnWindowDays\s*(?:\|\||\?\?)\s*7/);
  });

  it("shows configured warranty and return claims only when values exist", () => {
    const footer = source("packages/shared/components/gadget/gadget-footer.tsx");
    const checkout = source(
      "packages/shared/components/checkout/checkout-desktop-sidebar.tsx",
    );

    assert.match(footer, /config\.warrantyMonths\s*&&/);
    assert.match(footer, /config\.returnWindowDays\s*&&/);
    assert.match(checkout, /warrantyMonths\s*\?/);
    assert.match(checkout, /returnWindowDays\s*\?/);
  });
});
