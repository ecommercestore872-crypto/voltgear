import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as rules from "./inbox-pagination-rules";
import * as inboxRules from "./db/inbox-rules";

const root = path.resolve(import.meta.dirname, "../../..");
function load<T>(file: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, console: { error() {} },
    require(name: string) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports as T;
}

type Store = Pick<typeof import("./db/inbox-store"), "listContactSubmissionsPage">;
function fixture(error: Error | null = null) {
  const calls: { method: string; args: unknown[] }[] = [];
  const rows = Array.from({ length: 300 }, (_, index) => ({
    id: String(index).padStart(4, "0"), is_demo: false,
    created_at: new Date(Date.UTC(2026, 0, 1) - index * 1000).toISOString(),
    kind: index >= 220 ? "complaint" : "contact",
    status: index >= 220 ? "closed" : "new",
    name: index >= 220 ? "Target customer" : "Other customer",
    email: `customer${index}@example.test`, subject: "Question", message: "Message",
  }));
  const store = load<Store>("packages/shared/lib/db/inbox-store.ts", {
    "@/lib/inbox-pagination-rules": rules,
    "@/lib/db/inbox-rules": inboxRules,
    "@/lib/supabase/server": {
      getServiceClient(options: unknown) {
        assert.equal(JSON.stringify(options), JSON.stringify({ admin: true }));
        return { from(table: string) {
          assert.equal(table, "contact_submissions");
          const predicates: ((row: Record<string, unknown>) => boolean)[] = [];
          const orders: { key: string; ascending: boolean }[] = [];
          let range = [0, rows.length - 1];
          const query = {
            select(...args: unknown[]) { calls.push({ method: "select", args }); return query; },
            order(key: string, options: { ascending: boolean }) { orders.push({ key, ...options }); return query; },
            eq(key: string, value: unknown) {
              calls.push({ method: "eq", args: [key, value] });
              predicates.push((row) => row[key] === value); return query;
            },
            or(value: string) {
              calls.push({ method: "or", args: [value] });
              const clauses = value.split(",").map((clause) => clause.split(".ilike.%"));
              predicates.push((row) => clauses.some(([field, pattern]) =>
                String(row[field]).toLowerCase().includes(pattern.slice(0, -1).toLowerCase())));
              return query;
            },
            range(from: number, to: number) { range = [from, to]; calls.push({ method: "range", args: range }); return query; },
            then(resolve: (result: unknown) => unknown) {
              const matching = rows.filter((row) => predicates.every((test) => test(row)))
                .sort((left, right) => {
                  for (const { key, ascending } of orders) {
                    const difference = String(left[key as keyof typeof left]).localeCompare(String(right[key as keyof typeof right]));
                    if (difference) return ascending ? difference : -difference;
                  }
                  return 0;
                });
              return Promise.resolve({ data: matching.slice(range[0], range[1] + 1), count: matching.length, error }).then(resolve);
            },
          };
          return query;
        } };
      },
    },
  });
  return { store, calls };
}

function route(store: Store, authorized = true) {
  return load<{ GET(request: Request): Promise<Response> }>("apps/admin/app/api/admin/inbox/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/admin": { isAdminRequest: () => authorized },
    "@/lib/admin-api-observability": { withAdminApiObservability: (_name: string, handler: unknown) => handler },
    "@/lib/db/inbox-rules": inboxRules,
    "@/lib/inbox-pagination-rules": rules,
    "@/lib/db/inbox-store": store,
  });
}

describe("inbox counted pagination", () => {
  it("reaches every record beyond the previous 200-message cutoff in bounded pages", async () => {
    const { store, calls } = fixture();
    const ids: string[] = [];
    for (let page = 1; page <= 6; page++) {
      const result = await store.listContactSubmissionsPage({ page });
      assert.equal(result.total, 300);
      assert.equal(result.pageSize, 50);
      assert.equal(result.items.length, 50);
      ids.push(...result.items.map((item) => item.id));
    }
    assert.equal(new Set(ids).size, 300);
    assert.ok(calls.filter((call) => call.method === "select").every((call) =>
      JSON.stringify(call.args[1]) === JSON.stringify({ count: "exact" })));
  });

  it("applies kind, status, search and live-data filters before the counted range", async () => {
    const { store, calls } = fixture();
    const result = await store.listContactSubmissionsPage({ kind: "complaint", status: "closed", q: "Target", page: 2 });
    assert.equal(result.total, 80);
    assert.equal(result.items.length, 30);
    assert.equal(result.items[0].id, "0270");
    assert.equal(calls.at(-1)?.method, "range");
    assert.equal(JSON.stringify(calls.at(-1)?.args), "[50,99]");
    assert.ok(calls.some((call) => call.method === "eq" && call.args[0] === "is_demo" && call.args[1] === false));
  });

  it("normalizes URL state and keeps search/filter/page when building navigation", () => {
    const filters = rules.inboxListFilters({ kind: "complaint", status: "closed", q: "  ali@example.test  ", page: "5" });
    assert.equal(rules.inboxListHref(filters), "/admin/inbox?kind=complaint&status=closed&q=ali%40example.test&page=5");
    for (const page of ["bad", "2.5", -1, Infinity]) assert.equal(rules.normalizeInboxPage(page), 1);
    assert.equal(rules.normalizeInboxSearch("%(alice),status.eq.new"), "alice status.eq.new");
    assert.equal(rules.normalizeInboxSearch("x".repeat(100)).length, 80);
    assert.equal(rules.inboxNoteIsDirty("changed", "saved"), true);
    assert.equal(rules.inboxNoteIsDirty("saved", "saved"), false);
  });

  it("returns API pagination metadata and applies URL filters", async () => {
    const api = route(fixture().store);
    const response = await api.GET(new Request("https://admin.example/api/admin/inbox?kind=complaint&status=closed&q=Target&page=2"));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.total, 80);
    assert.equal(body.page, 2);
    assert.equal(body.pageSize, 50);
    assert.equal(body.items.length, 30);
  });

  it("preserves auth, rejects invalid filters and reports database failures", async () => {
    const subject = fixture();
    const unauthorized = await route(subject.store, false).GET(new Request("https://admin.example/api/admin/inbox"));
    assert.equal(unauthorized.status, 401);
    for (const query of ["kind=unknown", "status=unknown"]) {
      assert.equal((await route(subject.store).GET(new Request(`https://admin.example/api/admin/inbox?${query}`))).status, 400);
    }
    assert.equal(subject.calls.length, 0);
    const failed = fixture(new Error("private database detail"));
    await assert.rejects(failed.store.listContactSubmissionsPage(), /private database detail/);
    const response = await route(failed.store).GET(new Request("https://admin.example/api/admin/inbox"));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Inbox is temporarily unavailable." });
  });
});
