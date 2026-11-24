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

  it("loads the admin stylesheet and keeps the admin font tokens", () => {
    const adminLayout = read("apps/admin/app/layout.tsx");
    const adminCss = read("apps/admin/app/globals.css");

    assert.match(adminLayout, /@fontsource-variable\/manrope\/wght\.css/);
    assert.match(
      adminCss,
      /Self-hosted Manrope[^]*?\*\/\s*\.admin-font-manrope\s*\{/,
      "Keep the admin font class outside a Tailwind layer so it cannot be purged",
    );
    assert.match(adminCss, /--font-gadget-sans:\s*"Manrope Variable"/);
  });

  it("self-hosts the storefront fonts with next/font/local, Latin subset, swap, preloaded", () => {
    const fonts = read("packages/shared/components/gadget/gadget-fonts.ts");
    const storefrontLayout = read("apps/storefront/app/layout.tsx");
    const storefrontCss = read("apps/storefront/app/globals.css");

    assert.match(fonts, /from "next\/font\/local"/);
    assert.match(fonts, /manrope-latin-wght-normal\.woff2/);
    assert.match(fonts, /newsreader-latin-wght-normal\.woff2/);
    assert.equal((fonts.match(/display:\s*"swap"/g) ?? []).length, 2);
    assert.doesNotMatch(fonts, /preload:\s*false/, "Both families are used above the fold");
    assert.match(fonts, /variable:\s*"--font-gadget-sans"/);
    assert.match(fonts, /variable:\s*"--font-gadget-display"/);
    // The old per-subset @fontsource stylesheets were a render-blocking request.
    assert.doesNotMatch(storefrontLayout, /@fontsource-variable/);
    for (const file of [
      "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
      "node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
    ]) {
      assert.ok(read(file).length > 0, `${file} must exist`);
    }
    assert.match(
      storefrontCss,
      /Local font files[^]*?\*\/\s*\.gadget-fonts\s*\{/,
      "Keep the storefront font class outside a Tailwind layer so it cannot be purged",
    );
    assert.doesNotMatch(storefrontCss, /--font-gadget-sans:/, "next/font defines the family variables");
    assert.match(storefrontCss, /--font-sans:\s*var\(--font-gadget-sans\)/);
    assert.match(storefrontCss, /--font-heading:\s*var\(--font-gadget-display\)/);
  });
});
