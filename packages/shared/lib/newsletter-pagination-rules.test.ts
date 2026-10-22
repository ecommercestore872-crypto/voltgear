import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as rules from "./newsletter-pagination-rules";
import * as newsletterRules from "./newsletter-rules";

const root = path.resolve(import.meta.dirname, "../../..");
function load<T>(file: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, TextEncoder, ReadableStream, console: { error() {} },
    require(name: string) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports as T;
}

type Store = Pick<typeof import("./db/newsletter-store"), "listNewsletterSubscribersPage" | "subscribedNewsletterBatches" | "unsubscribeNewsletterSubscriber">;
type Row = { id: string; created_at: string; email: string; source: string; status: string };
function fixture(failAtQuery = -1) {
  const calls: { method: string; args: unknown[] }[] = [];
  const rows: Row[] = Array.from({ length: 612 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    created_at: "2026-10-22T10:00:00.000Z", email: `person${index}@example.test`,
    source: index >= 550 ? "popup" : "footer", status: index < 607 ? "subscribed" : "unsubscribed",
  }));
  let queryCount = 0;
  const store = load<Store>("packages/shared/lib/db/newsletter-store.ts", {
    "@/lib/newsletter-pagination-rules": rules,
    "@/lib/newsletter-rules": newsletterRules,
    "@/lib/supabase/server": {
      getServiceClient(options: unknown) {
        assert.equal(JSON.stringify(options), JSON.stringify({ admin: true }));
        return { from(table: string) {
          assert.equal(table, "newsletter_subscribers");
          const number = ++queryCount;
          const predicates: ((row: Row) => boolean)[] = [];
          const orders: { key: keyof Row; ascending: boolean }[] = [];
          let range = [0, Infinity];
          function result() {
            const matching = rows.filter((row) => predicates.every((test) => test(row)))
              .sort((left, right) => {
                for (const { key, ascending } of orders) {
                  const difference = left[key].localeCompare(right[key]);
                  if (difference) return ascending ? difference : -difference;
                }
                return 0;
              });
            return { data: matching.slice(range[0], range[1] + 1), count: matching.length,
              error: number === failAtQuery ? new Error("fixture database failure") : null };
          }
          const query = {
            select(...args: unknown[]) { calls.push({ method: "select", args }); return query; },
            eq(key: keyof Row, value: unknown) { calls.push({ method: "eq", args: [key, value] }); predicates.push((row) => row[key] === value); return query; },
            gt(key: keyof Row, value: string) { calls.push({ method: "gt", args: [key, value] }); predicates.push((row) => row[key] > value); return query; },
            lte(key: keyof Row, value: string) { calls.push({ method: "lte", args: [key, value] }); predicates.push((row) => row[key] <= value); return query; },
            or(value: string) {
              calls.push({ method: "or", args: [value] });
              const clauses = value.split(",").map((clause) => clause.split(".ilike.%"));
              predicates.push((row) => clauses.some(([key, pattern]) => row[key as keyof Row].toLowerCase().includes(pattern.slice(0, -1).toLowerCase())));
              return query;
            },
            order(key: keyof Row, options: { ascending: boolean }) { orders.push({ key, ...options }); return query; },
            limit(limit: number) { calls.push({ method: "limit", args: [limit] }); range = [0, limit - 1]; return query; },
            range(from: number, to: number) { calls.push({ method: "range", args: [from, to] }); range = [from, to]; return query; },
            async maybeSingle() { const value = result(); return { ...value, data: value.data[0] ?? null }; },
            then(resolve: (value: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
          };
          return query;
        } };
      },
    },
  });
  return { store, calls, rows };
}

function route(store: Partial<Store>, authorized = true) {
  return load<{ GET(request: Request): Promise<Response>; PATCH(request: Request): Promise<Response> }>("apps/admin/app/api/admin/newsletter/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/admin": { isAdminRequest: () => authorized },
    "@/lib/admin-api-observability": { withAdminApiObservability: (_name: string, handler: unknown) => handler },
    "@/lib/newsletter-pagination-rules": rules,
    "@/lib/newsletter-rules": newsletterRules,
    "@/lib/db/newsletter-store": store,
  });
}

describe("newsletter pagination and complete CSV", () => {
  it("reaches subscribers beyond 500 with matching counts and bounded pages", async () => {
    const { store } = fixture();
    const result = await store.listNewsletterSubscribersPage({ page: 12 });
    assert.equal(result.total, 612);
    assert.equal(result.pageSize, 50);
    assert.equal(result.subscribers.length, 50);
    const final = await store.listNewsletterSubscribersPage({ page: 13 });
    assert.equal(final.subscribers.length, 12);
    assert.notEqual(result.subscribers[49].id, final.subscribers[0].id);
  });

  it("applies status and search before range and count", async () => {
    const { store, calls } = fixture();
    const result = await store.listNewsletterSubscribersPage({ status: "subscribed", q: "popup", page: 2 });
    assert.equal(result.total, 57);
    assert.equal(result.subscribers.length, 7);
    assert.ok(result.subscribers.every((row) => row.status === "subscribed" && row.source === "popup"));
    assert.equal(calls.at(-1)?.method, "range");
    assert.equal(JSON.stringify(calls.at(-1)?.args), "[50,99]");
  });

  it("uses bounded keyset batches without duplicating or skipping after earlier rows are deleted", async () => {
    const { store, rows, calls } = fixture();
    const batches = store.subscribedNewsletterBatches();
    const first = await batches.next();
    assert.ok(!first.done);
    assert.equal(first.value.length, 500);
    rows.splice(0, 10);
    rows.push({ id: "ffffffff-ffff-4fff-8fff-ffffffffffff", created_at: "2026-10-22T11:00:00.000Z", email: "new@example.test", source: "footer", status: "subscribed" });
    const second = await batches.next();
    assert.ok(!second.done);
    assert.equal(second.value.length, 107);
    const exported = [...first.value, ...second.value];
    assert.equal(new Set(exported.map((row) => row.id)).size, 607);
    assert.ok(exported.every((row) => row.status === "subscribed" && row.email !== "new@example.test"));
    assert.equal((await batches.next()).done, true);
    assert.ok(calls.some((call) => call.method === "gt"));
    assert.ok(calls.filter((call) => call.method === "limit").every((call) => Number(call.args[0]) <= 500));
    assert.ok(calls.some((call) => call.method === "lte" && call.args[0] === "created_at"));
  });

  it("streams every subscribed record regardless of the visible page, search or status", async () => {
    const { store } = fixture();
    const api = route({ ...store, listNewsletterSubscribersPage: async () => { throw new Error("CSV must not use a list page"); } });
    const response = await api.GET(new Request("https://admin.example/api/admin/newsletter?format=csv&page=99&status=unsubscribed&q=missing"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(response.headers.get("content-type") ?? "", /text\/csv/);
    const csv = await response.text();
    assert.equal(csv.trimEnd().split("\n").length, 608);
    assert.equal(csv.split("email,source,joined").length, 2);
    assert.match(csv, /person606@example.test/);
    assert.doesNotMatch(csv, /person607@example.test/);
  });

  it("returns list metadata, validates filters and keeps auth and unsubscribe contracts", async () => {
    const subject = fixture();
    const api = route(subject.store);
    const response = await api.GET(new Request("https://admin.example/api/admin/newsletter?status=subscribed&q=popup&page=2"));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.total, 57);
    assert.equal(body.page, 2);
    assert.equal(body.subscribers.length, 7);
    assert.equal((await api.GET(new Request("https://admin.example/api/admin/newsletter?status=bad"))).status, 400);
    assert.equal((await route(subject.store, false).GET(new Request("https://admin.example/api/admin/newsletter?format=csv"))).status, 401);
    const subscriber = { id: "fixture", status: "unsubscribed" };
    const patch = route({ unsubscribeNewsletterSubscriber: async (id: string) => {
      assert.equal(id, "fixture");
      return { ok: true, subscriber } as Awaited<ReturnType<Store["unsubscribeNewsletterSubscriber"]>>;
    } });
    const saved = await patch.PATCH(new Request("https://admin.example/api/admin/newsletter", { method: "PATCH", body: JSON.stringify({ id: "fixture", action: "unsubscribe" }) }));
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { subscriber });
    assert.equal((await patch.PATCH(new Request("https://admin.example/api/admin/newsletter", { method: "PATCH", body: "{}" }))).status, 400);
  });

  it("returns 503 for initial failures and fails the stream on a later batch error", async () => {
    const listFailure = fixture(1);
    await assert.rejects(listFailure.store.listNewsletterSubscribersPage(), /fixture database failure/);
    const failedList = await route(fixture(1).store).GET(new Request("https://admin.example/api/admin/newsletter"));
    assert.equal(failedList.status, 503);
    for (const query of [1, 2]) {
      const failedExport = await route(fixture(query).store).GET(new Request("https://admin.example/api/admin/newsletter?format=csv"));
      assert.equal(failedExport.status, 503);
    }
    const laterFailure = await route(fixture(3).store).GET(new Request("https://admin.example/api/admin/newsletter?format=csv"));
    assert.equal(laterFailure.status, 200);
    await assert.rejects(laterFailure.text(), /fixture database failure/);
  });

  it("exports a header when there are no subscribed addresses", async () => {
    const subject = fixture();
    subject.rows.forEach((row) => { row.status = "unsubscribed"; });
    const response = await route(subject.store).GET(new Request("https://admin.example/api/admin/newsletter?format=csv"));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "email,source,joined\n");
  });

  it("normalizes and preserves URL-backed subscriber filters", () => {
    const filters = rules.newsletterListFilters({ status: "unsubscribed", q: " ali@example.test ", page: "12" });
    assert.equal(rules.newsletterListHref(filters), "/admin/newsletter?status=unsubscribed&q=ali%40example.test&page=12");
    assert.equal(rules.normalizeNewsletterPage("2.5"), 1);
    assert.equal(rules.normalizeNewsletterSearch("  %(alice),  "), "alice");
  });
});
