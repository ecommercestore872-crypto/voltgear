import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it } from "node:test";
import ts from "typescript";
import type { AdminAuthorization } from "./admin";

function loadRoute(file: string, dependencies: Record<string, unknown>) {
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../../../apps/admin/app/api/admin/${file}/route.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, Buffer, process: { env: {} },
    require(name: string) {
      if (name === "@/lib/admin-api-observability") return { withAdminApiObservability: (_: string, handler: unknown) => handler };
      if (name === "next/server") return { NextResponse: { json(body: unknown, init?: ResponseInit) {
        const response = Response.json(body, init);
        return Object.assign(response, { cookies: { set(name: string, value: string, options: { maxAge: number }) {
          response.headers.set("set-cookie", `${name}=${value}; Max-Age=${options.maxAge}`);
        } } });
      } } };
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports.POST!;
}

describe("admin identity-aware password route", () => {
  function subject(authorization: AdminAuthorization | null) {
    const updated: string[] = []; let searched = 0;
    const POST = loadRoute("update-password", {
      "@/lib/admin": { adminRequestAuthorization: async () => authorization },
      "@/lib/admin-auth-email": { adminAuthEmailAllowlist: () => ["first@example.invalid", "second@example.invalid"] },
      "@/lib/admin-auth-supabase": { findAuthUserByEmail: async () => { searched++; return { id: "first-account" }; } },
      "@/lib/supabase/server": { getServiceClient: () => ({ auth: { admin: { updateUserById: async (id: string) => { updated.push(id); return { error: null }; } } } }) },
    });
    return { POST, updated, searches: () => searched };
  }
  const request = (password: unknown = "a-synthetic-long-password") => new Request("https://admin.example.invalid/api/admin/update-password", {
    method: "POST", body: JSON.stringify({ password }),
  });
  it("changes the browser actor's own account rather than the first allowlisted account", async () => {
    const s = subject({ kind: "browser", identity: { userId: "second-account", email: "second@example.invalid", expiresAt: "2030-01-01T00:00:00Z" } });
    assert.equal((await s.POST(request())).status, 200);
    assert.deepEqual(s.updated, ["second-account"]); assert.equal(s.searches(), 0);
  });
  it("preserves the existing explicit machine-bearer account selection", async () => {
    const s = subject({ kind: "bearer" }); assert.equal((await s.POST(request())).status, 200);
    assert.deepEqual(s.updated, ["first-account"]);
  });
  it("rejects unauthorized access and malformed/short passwords without updating an account", async () => {
    const denied = subject(null); assert.equal((await denied.POST(request())).status, 401); assert.equal(denied.updated.length, 0);
    for (const password of [null, {}, 1234, "short"]) {
      const s = subject({ kind: "bearer" }); assert.equal((await s.POST(request(password))).status, 400); assert.equal(s.updated.length, 0);
    }
  });
});

describe("logout keeps the cookie origin boundary and requires confirmed server revocation", () => {
  function subject(options: { trusted?: boolean; bearer?: boolean; authorized?: boolean; revokeFailure?: boolean } = {}) {
    let revocations = 0;
    const POST = loadRoute("logout", {
      "@/lib/admin": { adminCookieOptions: () => ({ maxAge: 28_800 }), cookieValue: () => "v2.synthetic",
        hasValidAdminBearer: () => options.bearer === true, isAdminRequest: async () => options.authorized !== false },
      "@/lib/admin-origin-rules": { isTrustedAdminMutationOrigin: () => options.trusted === true },
      "@/lib/admin-session-store": { revokeAdminBrowserSession: async () => { revocations++; if (options.revokeFailure) throw new Error("unavailable"); } },
      "@/lib/db/publish": { ADMIN_COOKIE: "vg_admin" },
    });
    return { POST, revocations: () => revocations };
  }
  const request = () => new Request("https://admin.example.invalid/api/admin/logout", { method: "POST" });
  it("rejects missing/wrong origins for cookie callers and invalid bearer credentials", async () => {
    const s = subject(); assert.equal((await s.POST(request())).status, 401); assert.equal(s.revocations(), 0);
    const invalid = subject({ trusted: true, authorized: false }); assert.equal((await invalid.POST(request())).status, 401);
  });
  it("preserves explicitly authenticated bearer logout without a browser Origin", async () => {
    const s = subject({ bearer: true }); assert.equal((await s.POST(request())).status, 200); assert.equal(s.revocations(), 1);
  });
  it("clears the cookie only after a trusted cookie request is revoked", async () => {
    const s = subject({ trusted: true }); const response = await s.POST(request());
    assert.equal(response.status, 200); assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/); assert.equal(s.revocations(), 1);
  });
  it("reports an unconfirmed signout and retains the browser credential when revocation fails", async () => {
    const s = subject({ trusted: true, revokeFailure: true }); const response = await s.POST(request());
    assert.equal(response.status, 503); assert.equal(response.headers.get("set-cookie"), null);
  });
});
