import assert from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { STOREFRONT_MERCHANDISING_CACHE_TAGS } from "./storefront-cache";

const here = dirname(fileURLToPath(import.meta.url));

describe("storefront merchandising cache tags", () => {
  test("every tagged storefront cache is busted by merchandising revalidate", () => {
    const cacheSrc = readFileSync(join(here, "storefront-cache.ts"), "utf8");
    const bustSet = new Set<string>(STOREFRONT_MERCHANDISING_CACHE_TAGS);
    const storeFiles = [
      "collection-store.ts",
      "store-catalog-store.ts",
      "store-chrome-store.ts",
      "store-content-store.ts",
      "store.ts",
    ];

    for (const filename of storeFiles) {
      const source = readFileSync(join(here, "db", filename), "utf8");
      for (const match of source.matchAll(/tags:\s*\[(STOREFRONT_[A-Z_]+)/g)) {
        const constName = match[1];
        const tagValue = cacheSrc.match(
          new RegExp(`export const ${constName} = "([^"]+)"`),
        )?.[1];
        assert.ok(tagValue, `missing constant ${constName} in storefront-cache.ts`);
        assert.ok(
          bustSet.has(tagValue),
          `${constName} in ${filename} must be busted by merchandising revalidate`,
        );
      }
    }
  });
});
