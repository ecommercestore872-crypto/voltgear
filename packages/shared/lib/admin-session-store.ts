import { isAllowedAdminAuthEmail, normalizeAdminEmail } from "@/lib/admin-auth-email";
import { createAdminSessionToken, hashAdminSessionToken, isAdminSessionToken } from "@/lib/admin-session";

export type AdminSessionIdentity = { userId: string; email: string; expiresAt: string };

/** Server/Edge only. Never import into a client component. No positive session cache. */
async function sessionRpc(name: string, args: Record<string, string>): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Admin session service unavailable.");
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))) {
    throw new Error("Admin session service unavailable.");
  }
  const response = await fetch(`${url.origin}/rest/v1/rpc/${name}`, {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5_000),
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error("Admin session service unavailable.");
  return response.json();
}

function identity(value: unknown): AdminSessionIdentity | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.userId !== "string" || typeof row.email !== "string" || typeof row.expiresAt !== "string") return null;
  const email = normalizeAdminEmail(row.email);
  if (!isAllowedAdminAuthEmail(email) || !Number.isFinite(Date.parse(row.expiresAt)) || Date.parse(row.expiresAt) <= Date.now()) return null;
  return { userId: row.userId, email, expiresAt: row.expiresAt };
}

/** Only call after Supabase Auth has verified this password and returned its session. */
export async function createAdminBrowserSession(userId: string, authSessionId: string, userUpdatedAt: string): Promise<string> {
  const token = createAdminSessionToken();
  const result = await sessionRpc("admin_create_browser_session_v2", {
    p_token_hash: hashAdminSessionToken(token), p_user_id: userId, p_auth_session_id: authSessionId, p_user_updated_at: userUpdatedAt,
  });
  if (!identity(result)) throw new Error("Admin session could not be established.");
  return token;
}

export async function readAdminBrowserSession(token: string): Promise<AdminSessionIdentity | null> {
  if (!isAdminSessionToken(token)) return null;
  try {
    return identity(await sessionRpc("admin_validate_browser_session_v2", { p_token_hash: hashAdminSessionToken(token) }));
  } catch {
    // No legacy or cached-accept fallback when the authoritative service is unavailable.
    return null;
  }
}

export async function revokeAdminBrowserSession(token: string): Promise<void> {
  if (!isAdminSessionToken(token)) return;
  const revoked = await sessionRpc("admin_revoke_browser_session_v2", { p_token_hash: hashAdminSessionToken(token) });
  if (revoked !== true) throw new Error("Admin session could not be revoked.");
}
