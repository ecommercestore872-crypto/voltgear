import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  isExplicitStorefrontRootSlug,
  storefrontCmsStaticParams,
} from "./[slug]/static-params";

const storefrontApp = dirname(fileURLToPath(import.meta.url));

function explicitRootPageSlugs(): string[] {
  return readdirSync(storefrontApp, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith("[") &&
        existsSync(join(storefrontApp, entry.name, "page.tsx")),
    )
    .map((entry) => entry.name)
    .sort();
}

describe("storefront root route ownership", () => {
  it("reserves every explicit top-level page from the CMS catch-all", () => {
    const unreserved = explicitRootPageSlugs().filter(
      (slug) => !isExplicitStorefrontRootSlug(slug),
    );

    assert.deepEqual(
      unreserved,
      [],
      `Add new explicit root pages to the CMS exclusion set: ${unreserved.join(", ")}`,
    );
  });

  it("keeps ordinary CMS pages eligible for catch-all prerendering", () => {
    assert.equal(isExplicitStorefrontRootSlug("brand-story"), false);
    assert.equal(isExplicitStorefrontRootSlug(" About "), true);
  });

  it("emits only non-blog CMS slugs that do not collide with explicit pages", () => {
    assert.deepEqual(
      storefrontCmsStaticParams([
        { slug: "about", pageType: "static" },
        { slug: "privacy-policy", pageType: "static" },
        { slug: "buying-guide", pageType: "blog" },
        { slug: "brand-story", pageType: "static" },
        { slug: "" },
      ]),
      [{ slug: "brand-story" }],
    );
  });
});
