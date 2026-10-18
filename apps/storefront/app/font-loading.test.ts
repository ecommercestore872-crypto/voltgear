import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath: string): string {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}

function manifest(relativePath: string): Record<string, unknown> {
  return JSON.parse(read(relativePath)) as Record<string, unknown>;
}

describe("deterministic production font loading", () => {
  it("does not use the Google font loader in active admin or storefront font modules", () => {
    for (const relativePath of [
      "apps/admin/lib/admin-fonts.ts",
      "packages/shared/components/gadget/gadget-fonts.ts",
    ]) {
      assert.doesNotMatch(read(relativePath), /next\/font\/google/);
    }
  });

  it("pins local font packages in the workspaces that import them", () => {
    const admin = manifest("apps/admin/package.json") as {
      dependencies?: Record<string, string>;
    };
    const storefront = manifest("apps/storefront/package.json") as {
      dependencies?: Record<string, string>;
    };

    assert.equal(admin.dependencies?.["@fontsource-variable/manrope"], "5.3.0");
    assert.equal(storefront.dependencies?.["@fontsource-variable/manrope"], "5.3.0");
    assert.equal(storefront.dependencies?.["@fontsource-variable/newsreader"], "5.3.0");
  });

  it("loads the local stylesheets and preserves the public CSS variables", () => {
    const adminLayout = read("apps/admin/app/layout.tsx");
    const storefrontLayout = read("apps/storefront/app/layout.tsx");
    const adminCss = read("apps/admin/app/globals.css");
    const storefrontCss = read("apps/storefront/app/globals.css");

    assert.match(adminLayout, /@fontsource-variable\/manrope\/wght\.css/);
    assert.match(storefrontLayout, /@fontsource-variable\/manrope\/wght\.css/);
    assert.match(storefrontLayout, /@fontsource-variable\/newsreader\/wght\.css/);
    assert.match(
      adminCss,
      /Self-hosted Manrope[^]*?\*\/\s*\.admin-font-manrope\s*\{/,
      "Keep the admin font class outside a Tailwind layer so it cannot be purged",
    );
    assert.match(
      storefrontCss,
      /Local font files[^]*?\*\/\s*\.gadget-fonts\s*\{/,
      "Keep the storefront font class outside a Tailwind layer so it cannot be purged",
    );
    assert.match(adminCss, /--font-gadget-sans:\s*"Manrope Variable"/);
    assert.match(storefrontCss, /--font-gadget-sans:\s*"Manrope Variable"/);
    assert.match(storefrontCss, /--font-gadget-display:\s*"Newsreader Variable"/);
    assert.match(storefrontCss, /--font-sans:\s*var\(--font-gadget-sans\)/);
    assert.match(storefrontCss, /--font-heading:\s*var\(--font-gadget-display\)/);
  });
});
