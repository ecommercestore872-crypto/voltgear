import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { createAdminSessionToken, hashAdminSessionToken } from "./admin-session";
import { createAdminBrowserSession, readAdminBrowserSession, revokeAdminBrowserSession } from "./admin-session-store";

const activeIdentity = () => ({ userId: "synthetic-id", email: "admin@example.invalid", expiresAt: new Date(Date.now() + 60_000).toISOString() });
async function fixture(run: () => Promise<void>, fetcher: typeof fetch) {
  const savedFetch = globalThis.fetch;
  const values = { NEXT_PUBLIC_SUPABASE_URL: "https://isolated.example.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", ADMIN_AUTH_EMAILS: "admin@example.invalid" };
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  globalThis.fetch = fetcher;
  try { await run(); } finally {
    globalThis.fetch = savedFetch;
    for (const key of Object.keys(values)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
  }
}

describe("authoritative browser session adapter", () => {
  it("sends only a hashed unique credential to create and binds verified Auth identity version", async () => {
    let transmitted = "";
    await fixture(async () => {
      const token = await createAdminBrowserSession("synthetic-id", "auth-session", "2026-10-26T00:00:00Z");
      const args = JSON.parse(transmitted);
      assert.equal(args.p_token_hash, hashAdminSessionToken(token));
      assert.equal(args.p_user_updated_at, "2026-10-26T00:00:00Z");
      assert.equal(args.p_auth_session_id, "auth-session");
      assert.equal(transmitted.includes(token), false);
    }, async (input, init) => {
      assert.match(String(input), /\/admin_create_browser_session_v2$/);
      assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
      transmitted = String(init?.body); return Response.json(activeIdentity());
    });
  });

  it("rejects legacy and malformed credentials without contacting the backend", async () => {
    await fixture(async () => {
      for (const token of ["", "a".repeat(64), "shared-secret", "v2." + "z".repeat(64)]) assert.equal(await readAdminBrowserSession(token), null);
    }, async () => { throw new Error("Unexpected backend call"); });
  });

  it("rechecks every request rather than caching an accepted session", async () => {
    let calls = 0;
    await fixture(async () => {
      const token = createAdminSessionToken();
      assert.ok(await readAdminBrowserSession(token));
      assert.equal(await readAdminBrowserSession(token), null);
      assert.equal(calls, 2);
    }, async () => Response.json(++calls === 1 ? activeIdentity() : null));
  });

  it("fails closed for expired, disallowed and malformed authoritative responses", async () => {
    for (const value of [null, {}, [], { ...activeIdentity(), expiresAt: "invalid" }, { ...activeIdentity(), expiresAt: "2020-01-01T00:00:00Z" }, { ...activeIdentity(), email: "removed@example.invalid" }]) {
      await fixture(async () => assert.equal(await readAdminBrowserSession(createAdminSessionToken()), null), async () => Response.json(value));
    }
  });

  it("fails closed for backend errors, invalid JSON and thrown network errors", async () => {
    for (const fetcher of [async () => new Response("unavailable", { status: 503 }), async () => new Response("invalid JSON"), async () => { throw new Error("private network detail"); }]) {
      await fixture(async () => assert.equal(await readAdminBrowserSession(createAdminSessionToken()), null), fetcher);
    }
  });

  it("refuses cleartext remote providers and missing service configuration", async () => {
    await fixture(async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://remote.example.invalid";
      assert.equal(await readAdminBrowserSession(createAdminSessionToken()), null);
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      assert.equal(await readAdminBrowserSession(createAdminSessionToken()), null);
    }, async () => { throw new Error("Unexpected backend call"); });
  });

  it("requires authoritative revocation success before claiming signout", async () => {
    for (const value of [false, null, {}]) {
      await fixture(async () => assert.rejects(revokeAdminBrowserSession(createAdminSessionToken()), /could not be revoked/), async () => Response.json(value));
    }
    await fixture(async () => revokeAdminBrowserSession(createAdminSessionToken()), async (input, init) => {
      assert.match(String(input), /\/admin_revoke_browser_session_v2$/);
      assert.match(JSON.parse(String(init?.body)).p_token_hash, /^[a-f0-9]{64}$/);
      return Response.json(true);
    });
  });

  it("does not issue a browser credential when session creation is unavailable or denied", async () => {
    await fixture(async () => assert.rejects(createAdminBrowserSession("user", "session", "2026-10-26T00:00:00Z")), async () => Response.json(null));
    await fixture(async () => assert.rejects(createAdminBrowserSession("user", "session", "2026-10-26T00:00:00Z")), async () => new Response("no", { status: 403 }));
  });
});

it("awaits asynchronous authorization at every deployed route boundary", async () => {
  const root = process.cwd();
  let checked = 0;
  async function visit(directory: string) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) await visit(path);
      else if (item.name === "route.ts") {
        const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true);
        function inspect(node: ts.Node) {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["isAdminRequest", "adminRequestAuthorization"].includes(node.expression.text)) {
            checked += 1;
            assert.equal(ts.isAwaitExpression(node.parent), true, `Authorization must be awaited: ${path}`);
          }
          ts.forEachChild(node, inspect);
        }
        inspect(source);
      }
    }
  }
  await visit(join(root, "apps/admin/app/api"));
  await visit(join(root, "apps/storefront/app/api"));
  assert.ok(checked >= 90);
});
