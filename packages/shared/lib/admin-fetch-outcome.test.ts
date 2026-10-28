import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { AdminRequestError } from "./admin-request-error";
import { completeAdminLogout } from "./admin-logout";

function subject(fetcher: typeof fetch) {
  const exports = {};
  const effects: string[] = [];
  runInNewContext(ts.transpileModule(readFileSync(new URL("../components/admin/admin-fetch.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, fetch: fetcher, FormData, window: { location: { assign: () => effects.push("redirect") } },
    require(name: string) {
      if (name === "@/lib/admin-token") return { adminHeaders: () => ({}), clearAdminToken() { effects.push("clear"); } };
      if (name === "@/lib/admin-upload-rules") return { validateAdminUploadMetadata() {} };
      if (name === "@/lib/admin-request-error") return { AdminRequestError };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return Object.assign(exports, { effects }) as { effects: string[];
    adminFetch: (url: string, options?: RequestInit, behavior?: { redirectOnUnauthorized?: boolean }) => Promise<unknown> };
}

it("logout through the real API client preserves state/navigation on validator401 or revoker503", async () => {
  for (const status of [401, 503]) {
    const api = subject(async () => Response.json({ error: "Synthetic service unavailable" }, { status }));
    await assert.rejects(completeAdminLogout({
      request: () => api.adminFetch("/api/admin/logout", { method: "POST" }, { redirectOnUnauthorized: false }),
      clearLocalToken: () => api.effects.push("logout clear"), navigate: () => api.effects.push("logout navigate"),
    }));
    assert.deepEqual(api.effects, []);
  }
});
it("ordinary unauthorized requests retain their existing sign-in redirect", async () => {
  const api = subject(async () => Response.json({}, { status: 401 }));
  await assert.rejects(api.adminFetch("/api/admin/products"));
  assert.deepEqual(api.effects, ["clear", "redirect"]);
});

for (const status of [400, 409, 408, 500, 502, 503]) {
  it(`classifies HTTP ${status} mutation outcomes conservatively`, async () => {
    const api = subject(async () => Response.json({ error: "Failure" }, { status }));
    await assert.rejects(api.adminFetch("/api/admin/products/fixture", { method: "PATCH" }),
      (error: unknown) => Boolean(error && typeof error === "object" && "outcomeUncertain" in error && error.outcomeUncertain === (status === 408 || status >= 500)));
  });
}
for (const method of ["GET", "PATCH", "POST", "DELETE"]) {
  it(`marks lost ${method} transport as ${method === "GET" ? "retryable read" : "unknown write"}`, async () => {
    const api = subject(async () => { throw new Error("Synthetic network loss"); });
    await assert.rejects(api.adminFetch("/api/admin/products", { method }),
      (error: unknown) => Boolean(error && typeof error === "object" && "outcomeUncertain" in error && error.outcomeUncertain === (method !== "GET")));
  });
}
