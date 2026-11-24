import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Ad clicks (Instagram/Facebook) always add ?fbclid= / ?utm_*. The PDP stays a cached
 * static/ISR page only while nothing on its render path reads the request. This is a
 * source guard: if any of these files starts using a dynamic API, the PDP silently becomes
 * uncached (every ad click travels to the Sydney function + database) and this test fails.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const shared = "packages/shared/components";
const pdpDir = "apps/storefront/app/product/[slug]";

const gadgetPdp = readdirSync(join(root, shared, "gadget"))
  .filter((f) => f.startsWith("gadget-pdp-") && f.endsWith(".tsx"))
  .map((f) => `${shared}/gadget/${f}`);

const renderPath = [
  `${pdpDir}/page.tsx`,
  "apps/storefront/app/layout.tsx",
  "apps/storefront/app/template.tsx",
  ...gadgetPdp,
  `${shared}/gadget/gadget-buy-box.tsx`,
  `${shared}/product/gadget-pdp-deferred.tsx`,
  `${shared}/product/product-gallery.tsx`,
  `${shared}/layout/app-chrome.tsx`,
  "packages/shared/lib/db/product-pdp.ts",
  "packages/shared/lib/db/storefront-shell.ts",
];

function code(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
    .replace(/\/\*[^]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const forbidden: [RegExp, string][] = [
  [/next\/headers/, "next/headers (cookies()/headers())"],
  [/\bcookies\s*\(/, "cookies()"],
  [/\bheaders\s*\(/, "headers()"],
  [/\bsearchParams\b/, "searchParams"],
  [/useSearchParams/, "useSearchParams"],
  [/force-dynamic/, "force-dynamic"],
  [/unstable_noStore|\bconnection\s*\(/, "noStore()/connection()"],
  [/revalidate\s*=\s*0\b/, "revalidate = 0"],
  [/@\/lib\/demo["']/, "@/lib/demo (reads cookies)"],
];

describe("product page stays static/ISR for ad-click URLs (?fbclid=, ?utm_*)", () => {
  for (const file of renderPath) {
    it(`${file} has no request-time API`, () => {
      const source = code(file);
      for (const [pattern, label] of forbidden) {
        assert.doesNotMatch(source, pattern, `${file} uses ${label}; the PDP would become dynamic`);
      }
    });
  }

  it("page and layout declare a positive ISR window", () => {
    for (const file of [`${pdpDir}/page.tsx`, "apps/storefront/app/layout.tsx"]) {
      assert.match(code(file), /export const revalidate = [1-9]\d*;/, file);
    }
  });

  it("middleware does not run on product pages", () => {
    const middleware = code("apps/storefront/middleware.ts");
    const matcher = /matcher:\s*\[([^\]]*)\]/.exec(middleware)?.[1] ?? "";
    assert.ok(matcher.length > 0, "middleware matcher not found");
    assert.doesNotMatch(matcher, /product|\*\*|\(\.\*\)|\(\?!/);
  });
});
