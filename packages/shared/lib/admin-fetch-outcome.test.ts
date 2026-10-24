import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { AdminRequestError } from "./admin-request-error";

function subject(fetcher: typeof fetch) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL("../components/admin/admin-fetch.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, fetch: fetcher, FormData,
    require(name: string) {
      if (name === "@/lib/admin-token") return { adminHeaders: () => ({}), clearAdminToken() {} };
      if (name === "@/lib/admin-upload-rules") return { validateAdminUploadMetadata() {} };
      if (name === "@/lib/admin-request-error") return { AdminRequestError };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports as { adminFetch: (url: string, options?: RequestInit) => Promise<unknown> };
}

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
