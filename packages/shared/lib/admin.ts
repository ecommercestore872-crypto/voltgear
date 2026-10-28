import { ADMIN_COOKIE } from "@/lib/admin-cookie";
import { ADMIN_SESSION_MAX_AGE, sessionTokensEqual } from "@/lib/admin-session";
import { readAdminBrowserSession, type AdminSessionIdentity } from "@/lib/admin-session-store";
import { resolveAdminSecret } from "@/lib/deploy-rules";
import { isTrustedAdminMutationOrigin } from "@/lib/admin-origin-rules";

/**
 * Shared bearer credential for existing server-to-server integrations.
 * ADMIN_TOKEN, then REVALIDATION_TOKEN. Production has no demo fallback.
 */
export function getAdminSecret(): string {
  return resolveAdminSecret();
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE,
  };
}

export function cookieValue(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

export function hasValidAdminBearer(request: Request): boolean {
  const token = getAdminSecret();
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer\s+/i.test(auth)) return false;
  const provided = auth.replace(/^Bearer\s+/i, "");
  return Boolean(provided) && sessionTokensEqual(provided, token);
}

export type AdminAuthorization = { kind: "bearer" } | { kind: "browser"; identity: AdminSessionIdentity };

export async function adminRequestAuthorization(request: Request): Promise<AdminAuthorization | null> {
  if (hasValidAdminBearer(request)) return { kind: "bearer" };
  // SameSite=Lax does not protect against a compromised sibling origin. Browser
  // cookie mutations must prove their exact origin; bearer integrations are
  // authenticated above and do not rely on automatically attached credentials.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    if (!isTrustedAdminMutationOrigin(request)) return null;
  }
  const cookie = cookieValue(request, ADMIN_COOKIE);
  const identity = await readAdminBrowserSession(cookie);
  return identity ? { kind: "browser", identity } : null;
}

/** Accept a valid machine bearer or an authoritative, current browser session. */
export async function isAdminRequest(request: Request): Promise<boolean> {
  return Boolean(await adminRequestAuthorization(request));
}
