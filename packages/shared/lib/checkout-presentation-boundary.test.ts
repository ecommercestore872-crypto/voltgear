import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const checkoutDirectory = resolve(
  process.cwd(),
  "packages/shared/components/checkout",
);
const pagePath = resolve(checkoutDirectory, "checkout-page-client.tsx");
const sidebarPath = resolve(checkoutDirectory, "checkout-desktop-sidebar.tsx");

describe("checkout presentation boundary", () => {
  it("keeps the desktop summary in a stateless presentation component", () => {
    assert.equal(
      existsSync(sidebarPath),
      true,
      "checkout-desktop-sidebar.tsx must exist",
    );

    const page = readFileSync(pagePath, "utf8");
    const sidebar = readFileSync(sidebarPath, "utf8");

    assert.match(page, /from "@\/components\/checkout\/checkout-desktop-sidebar"/);
    assert.match(page, /<CheckoutDesktopSidebar/);
    assert.ok(
      page.split(/\r?\n/).length < 1_000,
      "checkout page should stay below 1,000 lines after presentation extraction",
    );
    assert.doesNotMatch(sidebar, /\buse(?:State|Effect|Memo|Ref)\b/);
    assert.match(sidebar, /Order summary/);
    assert.match(sidebar, /Have a promo code\?/);
    assert.match(sidebar, /Place Order/);
  });
});
