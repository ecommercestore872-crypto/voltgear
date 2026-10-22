import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import { scoreAdminSearchHits } from "./admin-search-rules";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");

function loadModule<T>(file: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  const source = readFileSync(path.join(repositoryRoot, file), "utf8");
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
      URL,
      console: { error: () => {} },
    },
  );
  return exports as T;
}

type ProductSearchStore = Pick<
  typeof import("./admin-product-read-store"),
  "listAdminProductsForCommandSearch" | "bumpAdminProductsCache"
>;

function productSearch(rows: Record<string, unknown>[] = [], error: Error | null = null) {
  const calls: { method: string; args: unknown[] }[] = [];
  const invalidatedTags: string[] = [];
  let candidateLimit = rows.length;
  const query = {
    select(...args: unknown[]) {
      calls.push({ method: "select", args });
      return query;
    },
    or(...args: unknown[]) {
      calls.push({ method: "or", args });
      return query;
    },
    order(...args: unknown[]) {
      calls.push({ method: "order", args });
      return query;
    },
    limit(value: number) {
      calls.push({ method: "limit", args: [value] });
      candidateLimit = value;
      return query;
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data: rows.slice(0, candidateLimit), error }).then(resolve);
    },
  };
  const store = loadModule<ProductSearchStore>("packages/shared/lib/db/admin-product-read-store.ts", {
    "next/cache": {},
    "@/lib/revalidate-storefront": {
      revalidateAdminCacheTag: (tag: string) => invalidatedTags.push(tag),
    },
    "@/lib/db/map": {
      mapProduct: () => { throw new Error("Command search must not hydrate products"); },
    },
    "@/lib/supabase/server": {
      getServiceClient: (options: unknown) => {
        assert.equal(JSON.stringify(options), JSON.stringify({ admin: true }));
        return {
          from: (table: string) => {
            calls.push({ method: "from", args: [table] });
            return query;
          },
        };
      },
    },
  });
  return { store, calls, invalidatedTags };
}

describe("admin command product search", () => {
  it("does not interpolate PostgREST punctuation or wildcard operators from input", async () => {
    const subject = productSearch();
    await subject.store.listAdminProductsForCommandSearch('watch),name.eq.("speaker"_*)');
    assert.equal(subject.calls.find((call) => call.method === "or")?.args[0],
      "name.ilike.%watch name.eq. speaker%,slug.ilike.%watch name.eq. speaker%,category.ilike.%watch name.eq. speaker%");
  });

  it("uses one bounded narrow query without image hydration or a draft lookup", async () => {
    const subject = productSearch([{ id: "p1", name: "Watch", slug: "watch" }]);
    const rows = await subject.store.listAdminProductsForCommandSearch("  %watch%  ");
    assert.equal(JSON.stringify(rows), JSON.stringify([{ id: "p1", name: "Watch", slug: "watch" }]));
    assert.equal(JSON.stringify(subject.calls), JSON.stringify([
      { method: "from", args: ["products"] },
      { method: "select", args: ["id, name, slug"] },
      { method: "or", args: ["name.ilike.%watch%,slug.ilike.%watch%,category.ilike.%watch%"] },
      { method: "order", args: ["updated_at", { ascending: false }] },
      { method: "limit", args: [120] },
    ]));
  });

  it("does not query for terms shorter than two characters after cleaning", async () => {
    const subject = productSearch();
    for (const term of ["", "  ", "x", "%%", "%x%"]) {
      assert.equal((await subject.store.listAdminProductsForCommandSearch(term)).length, 0);
    }
    assert.deepEqual(subject.calls, []);
  });

  it("retains the existing 80-character input and 120-candidate bounds", async () => {
    const subject = productSearch(Array.from({ length: 150 }, (_, index) => ({
      id: String(index), name: "Watch", slug: `watch-${index}`,
    })));
    const rows = await subject.store.listAdminProductsForCommandSearch("a".repeat(100));
    const pattern = `%${"a".repeat(80)}%`;
    assert.equal(rows.length, 120);
    assert.equal(subject.calls.find((call) => call.method === "or")?.args[0],
      `name.ilike.${pattern},slug.ilike.${pattern},category.ilike.${pattern}`);
  });

  it("propagates database failures to the API error handler", async () => {
    const error = new Error("Database unavailable");
    const subject = productSearch([], error);
    await assert.rejects(subject.store.listAdminProductsForCommandSearch("watch"), error);
  });

  it("feeds the API scorer directly and preserves ranking, slug matches and the 12-hit cap", async () => {
    const subject = productSearch([
      { id: "contains", name: "Ultra watch", slug: "ultra-watch" },
      { id: "slug", name: "Alpha", slug: "watch-alpha" },
      { id: "category-only", name: "Other", slug: "other" },
      ...Array.from({ length: 15 }, (_, index) => ({
        id: `p${index}`, name: `Watch ${String(index).padStart(2, "0")}`, slug: `watch-${index}`,
      })),
    ]);
    const route = loadModule<{ GET: (request: Request) => Promise<Response> }>(
      "apps/admin/app/api/admin/search/route.ts",
      {
        "next/server": { NextResponse: Response },
        "@/lib/admin-api-observability": {
          withAdminApiObservability: (_label: string, handler: unknown) => handler,
        },
        "@/lib/admin": { isAdminRequest: () => true },
        "@/lib/db/admin-search-rules": { scoreAdminSearchHits },
        "@/lib/db/admin-orders-store": { searchAdminOrdersByTerm: async () => [] },
        "@/lib/db/admin-store": subject.store,
        "@/lib/db/customer-list": { buildCustomerRowsFromOrders: () => [] },
      },
    );
    const response = await route.GET(new Request("https://admin.example/api/admin/search?q=watch"));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.hits.length, 12);
    assert.deepEqual(body.hits[0], {
      kind: "product", label: "Alpha", href: "/admin/products/slug", score: 70,
    });
    assert.ok(body.hits.every((hit: { score: number }) => hit.score === 70));
    assert.equal(subject.calls.filter((call) => call.method === "from").length, 1);
  });
});

describe("admin category count cache dependency", () => {
  it("tags the cached shop types with the same tag invalidated by product writes", async () => {
    let cacheOptions: { revalidate: number; tags: string[] } | undefined;
    const categories = loadModule<Pick<typeof import("./admin-category-store"), "listAdminShopTypes">>(
      "packages/shared/lib/db/admin-category-store.ts",
      {
        "next/cache": {
          unstable_cache: (_read: unknown, _key: string[], options: typeof cacheOptions) => {
            cacheOptions = options;
            return async () => [];
          },
        },
        "@/lib/revalidate-storefront": {},
        "@/lib/categories": {},
        "@/lib/db/category-rules": {},
        "@/lib/db/publish": {},
        "@/lib/supabase/server": {
          getServiceClient: () => { throw new Error("Cache registration must not query the database"); },
        },
      },
    );
    await categories.listAdminShopTypes();
    const products = productSearch();
    products.store.bumpAdminProductsCache();
    assert.equal(cacheOptions?.revalidate, 300);
    assert.ok(cacheOptions?.tags.includes("admin-shop-types"));
    assert.equal(products.invalidatedTags[0], "admin-products");
    assert.ok(cacheOptions?.tags.includes(products.invalidatedTags[0]));
  });
});
