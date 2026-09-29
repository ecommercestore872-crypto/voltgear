import assert from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { STOREFRONT_MERCHANDISING_CACHE_TAGS } from "./storefront-cache";

const here = dirname(fileURLToPath(import.meta.url));

describe("storefront merchandising cache tags", () => {
  test("every tag used in store.ts unstable_cache is busted by merchandising revalidate", () => {
    const storeSrc = readFileSync(join(here, "db", "store.ts"), "utf8");
    const cacheSrc = readFileSync(join(here, "storefront-cache.ts"), "utf8");
    const tagMatches = storeSrc.matchAll(/tags:\s*\[(STOREFRONT_[A-Z_]+)/g);
    const bustSet = new Set<string>(STOREFRONT_MERCHANDISING_CACHE_TAGS);

    for (const m of tagMatches) {
      const constName = m[1];
      const tagValue = cacheSrc.match(
        new RegExp(`export const ${constName} = "([^"]+)"`),
      )?.[1];
      assert.ok(tagValue, `missing constant ${constName} in storefront-cache.ts`);
      assert.ok(
        bustSet.has(tagValue),
        `${constName} (${tagValue}) must be in STOREFRONT_MERCHANDISING_CACHE_TAGS`,
      );
    }

    const collectionSrc = readFileSync(join(here, "db", "collection-store.ts"), "utf8");
    for (const m of collectionSrc.matchAll(/tags:\s*\[(STOREFRONT_[A-Z_]+)/g)) {
      const constName = m[1];
      const tagValue = cacheSrc.match(
        new RegExp(`export const ${constName} = "([^"]+)"`),
      )?.[1];
      assert.ok(tagValue);
      assert.ok(bustSet.has(tagValue), `${constName} in collection-store must be busted`);
    }
  });
});
