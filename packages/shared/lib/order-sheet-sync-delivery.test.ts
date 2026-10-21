import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { it } from "node:test";
import ts from "typescript";
import * as rules from "./order-sheet-sync-rules";

const source = readFileSync("packages/shared/lib/order-sheet-sync.ts", "utf8");

function sender(options: { configured?: boolean; failRead?: boolean; failGoogle?: boolean } = {}) {
  let reads = 0;
  let sends = 0;
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: (name: string) => {
      if (name.endsWith("order-sheet-sync-rules")) return rules;
      if (name.endsWith("defer-after-response")) return { deferAfterResponse: () => {} };
      if (name.endsWith("store-order-store")) return {
        getOrderByPublicId: async () => {
          reads++;
          if (options.failRead) throw new Error("Database read unavailable");
          return { orderId: "BNT-1", createdAt: new Date().toISOString(),
            subtotal: 100, shipping: 0, total: 100,
            items: [{ name: "Test item", quantity: 1, price: 100 }] };
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { env: options.configured === false ? {} : {
      GOOGLE_ORDER_SYNC_URL: "https://script.google.com/macros/s/test/exec",
      GOOGLE_ORDER_SYNC_SECRET: "test-secret-with-at-least-32-characters",
    } },
    fetch: async () => {
      sends++;
      if (options.failGoogle) throw new Error("Google unavailable");
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    },
    AbortSignal, console: { error: () => {} },
  });
  return { sync: () => exports.syncOrderToGoogleSheet("BNT-1"), counts: () => ({ reads, sends }) };
}

it("leaves unconfigured websites alone without even reading an order", async () => {
  const subject = sender({ configured: false });
  assert.equal(JSON.stringify(await subject.sync()), JSON.stringify({ ok: true, skipped: "not-configured" }));
  assert.deepEqual(subject.counts(), { reads: 0, sends: 0 });
});

it("returns a contained failure when Google is unavailable", async () => {
  const subject = sender({ failGoogle: true });
  assert.equal((await subject.sync() as { ok: boolean }).ok, false);
  assert.deepEqual(subject.counts(), { reads: 1, sends: 1 });
});

it("contains database read errors and never sends incomplete data", async () => {
  const subject = sender({ failRead: true });
  assert.equal((await subject.sync() as { ok: boolean }).ok, false);
  assert.deepEqual(subject.counts(), { reads: 1, sends: 0 });
});

it("delivers a signed copy using only a read of the saved order", async () => {
  const subject = sender();
  assert.equal((await subject.sync() as { ok: boolean }).ok, true);
  assert.deepEqual(subject.counts(), { reads: 1, sends: 1 });
});
