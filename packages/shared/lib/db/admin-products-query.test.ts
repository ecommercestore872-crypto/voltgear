import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as productInput from "../admin-product-input";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");

function loadModule<T>(file: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path.join(repositoryRoot, file), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: file,
  }).outputText, {
    exports, URL,
    require: (name: string) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name === "@/lib/admin-product-input") return productInput;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports as T;
}

type ProductRow = {
  id: string; name: string; slug: string; category: string; stock_status: string;
  updated_at: string; draft?: unknown;
};
type ProductStore = Pick<typeof import("./admin-product-read-store"),
  "listAdminProductsPageWithCount" | "listAdminProductsPage" | "listAdminProductsSearch">;

function fixture(size = 180): ProductRow[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `p${String(index).padStart(3, "0")}`,
    name: `Watch ${index}`, slug: `watch-${index}`, category: "watches",
    stock_status: "in-stock", updated_at: "2026-10-22T12:00:00Z",
  }));
}

function productStore(rows: ProductRow[], error: Error | null = null) {
  const queries: { method: string; args: unknown[] }[][] = [];
  const store = loadModule<ProductStore>("packages/shared/lib/db/admin-product-read-store.ts", {
    "next/cache": {},
    "@/lib/revalidate-storefront": {},
    "@/lib/db/map": {
      mapProduct: (row: ProductRow) => ({
        _id: row.id, name: row.name, slug: row.slug, category: row.category,
        stockStatus: row.stock_status, images: [], price: 1,
      }),
    },
    "@/lib/supabase/server": {
      getServiceClient: () => ({
        from(table: string) {
          assert.equal(table, "products");
          const calls: { method: string; args: unknown[] }[] = [];
          queries.push(calls);
          let candidates = [...rows];
          let bounds = [0, rows.length - 1];
          const orders: { field: keyof ProductRow; ascending: boolean }[] = [];
          const query = {
            select(...args: unknown[]) { calls.push({ method: "select", args }); return query; },
            or(filter: string) {
              calls.push({ method: "or", args: [filter] });
              const term = filter.split(".ilike.%")[1].split("%")[0].toLowerCase();
              candidates = candidates.filter((row) =>
                [row.name, row.slug, row.category].some((value) => value.toLowerCase().includes(term)));
              return query;
            },
            eq(field: keyof ProductRow, value: string) {
              calls.push({ method: "eq", args: [field, value] });
              candidates = candidates.filter((row) => row[field] === value);
              return query;
            },
            in(field: keyof ProductRow, values: string[]) {
              calls.push({ method: "in", args: [field, values] });
              candidates = candidates.filter((row) => values.includes(String(row[field])));
              return query;
            },
            not(field: keyof ProductRow, operator: string, value: unknown) {
              calls.push({ method: "not", args: [field, operator, value] });
              candidates = candidates.filter((row) => row[field] != null);
              return query;
            },
            order(field: keyof ProductRow, options: { ascending: boolean }) {
              calls.push({ method: "order", args: [field, options] });
              orders.push({ field, ascending: options.ascending });
              return query;
            },
            range(from: number, to: number) {
              calls.push({ method: "range", args: [from, to] }); bounds = [from, to]; return query;
            },
            limit(limit: number) {
              calls.push({ method: "limit", args: [limit] }); bounds = [0, limit - 1]; return query;
            },
            then(resolve: (value: unknown) => unknown) {
              candidates.sort((a, b) => {
                for (const order of orders) {
                  const result = String(a[order.field]).localeCompare(String(b[order.field]));
                  if (result) return order.ascending ? result : -result;
                }
                return 0;
              });
              return Promise.resolve({
                data: candidates.slice(bounds[0], bounds[1] + 1), count: candidates.length, error,
              }).then(resolve);
            },
          };
          return query;
        },
      }),
    },
  });
  return { store, queries };
}

describe("counted admin product pagination", () => {
  it("returns exact totals and reaches search matches after the old 120-row cap", async () => {
    const subject = productStore(fixture().reverse());
    const result = await subject.store.listAdminProductsPageWithCount({ q: "watch", page: 4, pageSize: 48 });
    assert.equal(result.total, 180);
    assert.equal(result.products.length, 36);
    assert.equal(result.products[0]._id, "p144");
    assert.equal(result.products.at(-1)?._id, "p179");
    const calls = subject.queries[0];
    assert.equal(JSON.stringify(calls[0].args[1]), JSON.stringify({ count: "exact" }));
    assert.equal(calls.some((call) => call.method === "limit"), false);
    assert.equal(JSON.stringify(calls.filter((call) => call.method === "order")), JSON.stringify([
      { method: "order", args: ["updated_at", { ascending: false }] },
      { method: "order", args: ["id", { ascending: true }] },
    ]));
    assert.equal(subject.queries.length, 2, "one counted page query plus draft flags for that page");
    assert.equal(JSON.stringify(subject.queries[1].find((call) => call.method === "in")?.args[1]),
      JSON.stringify(result.products.map((product) => product._id)));
  });

  it("finds the only stock-attention match beyond the first 120 search candidates", async () => {
    const rows = fixture();
    rows[179].stock_status = "out-of-stock";
    rows[179].draft = { name: "Edited watch" };
    const subject = productStore(rows);
    const result = await subject.store.listAdminProductsPageWithCount({ q: "watch", stockAttention: true, page: 1 });
    assert.equal(result.total, 1);
    assert.equal(result.products[0]._id, "p179");
    assert.equal(result.products[0].hasUnpublishedDraft, true);
    assert.equal(subject.queries[0].findIndex((call) => call.method === "in") <
      subject.queries[0].findIndex((call) => call.method === "range"), true);
  });

  it("combines category, search and stock before page two and counts only matching rows", async () => {
    const rows = fixture();
    for (const row of rows.slice(100)) row.stock_status = "low-stock";
    for (const row of rows.slice(170)) row.category = "audio";
    rows[169].name = "Speaker";
    rows[169].slug = "speaker";
    const subject = productStore(rows);
    const result = await subject.store.listAdminProductsPageWithCount({
      q: "watch-", category: "watches", stockAttention: true, page: 2, pageSize: 48,
    });
    assert.equal(result.total, 69);
    assert.equal(result.products.length, 21);
    assert.equal(result.products[0]._id, "p148");
    assert.equal(result.products.at(-1)?._id, "p168");
    const methods = subject.queries[0].map((call) => call.method);
    for (const filter of ["or", "eq", "in"]) assert.ok(methods.indexOf(filter) < methods.indexOf("range"));
  });

  it("normalizes bounds, reports empty pages honestly and preserves the legacy array contract", async () => {
    const subject = productStore(fixture());
    const first = await subject.store.listAdminProductsPageWithCount({ page: -2, pageSize: 999 });
    assert.equal(first.page, 1);
    assert.equal(first.pageSize, 100);
    const empty = await subject.store.listAdminProductsPageWithCount({ page: 99, q: "watch" });
    assert.equal(empty.total, 180);
    assert.equal(empty.products.length, 0);
    const legacy = await subject.store.listAdminProductsPage({ page: 1, pageSize: 3 });
    assert.equal(legacy.length, 3);
    const legacySearch = await subject.store.listAdminProductsSearch("watch");
    assert.equal(legacySearch.length, 120, "non-list search callers retain their existing bounded contract");
  });

  it("propagates page query failures without making a draft query", async () => {
    const error = new Error("Query unavailable");
    const subject = productStore(fixture(), error);
    await assert.rejects(subject.store.listAdminProductsPageWithCount({ page: 1, q: "watch" }), error);
    assert.equal(subject.queries.length, 1);
  });
});

describe("product list API and page contracts", () => {
  it("returns a safe service error instead of exposing product query failures", async () => {
    const route = loadModule<{ GET: (request: Request) => Promise<Response> }>(
      "apps/admin/app/api/admin/products/route.ts", {
        "next/server": { NextResponse: Response },
        "@/lib/admin-api-observability": { withAdminApiObservability: (_name: string, handler: unknown) => handler },
        "@/lib/admin": { isAdminRequest: () => true },
        "@/lib/db/admin-store": {
          ADMIN_PRODUCTS_PAGE_SIZE: 48,
          listAdminProductsPageWithCount: async () => { throw new Error("Private database detail"); },
        },
      },
    );
    const response = await route.GET(new Request("https://admin.example/api/admin/products?q=watch"));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Products are temporarily unavailable." });
  });

  it("returns search totals and pagination metadata while retaining the picker products array", async () => {
    const rows = fixture();
    for (const row of rows.slice(100)) row.stock_status = "low-stock";
    for (const row of rows.slice(170)) row.category = "audio";
    const subject = productStore(rows);
    const route = loadModule<{ GET: (request: Request) => Promise<Response> }>(
      "apps/admin/app/api/admin/products/route.ts", {
        "next/server": { NextResponse: Response },
        "@/lib/admin-api-observability": { withAdminApiObservability: (_name: string, handler: unknown) => handler },
        "@/lib/admin": { isAdminRequest: () => true },
        "@/lib/db/admin-store": { ADMIN_PRODUCTS_PAGE_SIZE: 48, ...subject.store },
      },
    );
    const response = await route.GET(new Request(
      "https://admin.example/api/admin/products?q=watch&category=watches&stock=attention&page=2&pageSize=48",
    ));
    const body = await response.json();
    assert.equal(body.total, 70);
    assert.equal(body.page, 2);
    assert.equal(body.pageSize, 48);
    assert.equal(body.category, "watches");
    assert.equal(body.q, "watch");
    assert.equal(body.stock, "attention");
    assert.equal(body.products[0]._id, "p148");
    assert.equal(body.products.length, 22);
  });

  it("passes all URL filters and counted metadata to the server-rendered ProductList", async () => {
    const rows = fixture();
    for (const row of rows.slice(100)) row.stock_status = "low-stock";
    for (const row of rows.slice(170)) row.category = "audio";
    const subject = productStore(rows);
    const jsx = (_type: unknown, props: unknown) => ({ props });
    const page = loadModule<{ default: (props: unknown) => Promise<{ props: Record<string, unknown> }> }>(
      "apps/admin/app/admin/products/page.tsx", {
        "react/jsx-runtime": { jsx, jsxs: jsx },
        "@/components/admin/product-list": { ProductList: "ProductList" },
        "@/lib/db/admin-store": {
          ADMIN_PRODUCTS_PAGE_SIZE: 48, ...subject.store,
          listAdminProductCategoryCounts: async () => [], listAdminShopTypes: async () => [],
        },
      },
    );
    const result = await page.default({
      searchParams: Promise.resolve({ q: "watch", category: "watches", stock: "attention", page: "2" }),
    });
    assert.equal(result.props.totalCount, 70);
    assert.equal(result.props.page, 2);
    assert.equal(result.props.serverQuery, "watch");
    assert.equal(result.props.serverCategory, "watches");
    assert.equal(result.props.stockFilter, "attention");
    assert.equal((result.props.products as unknown[]).length, 22);
  });
});
