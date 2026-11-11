import { ADMIN_ACTOR_COOKIE, ADMIN_COOKIE } from "@/lib/admin-cookie";
import { deriveAdminSessionToken, sessionTokensEqual, verifyAdminActorSession } from "@/lib/admin-session";
import { resolveAdminSecret } from "@/lib/deploy-rules";

/**
 * Shared password for admin UI and APIs.
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
    maxAge: 60 * 60 * 24 * 7,
  };
}

function cookieValue(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

/**
 * Accepts Authorization: Bearer <secret> or the httpOnly admin cookie.
 */
export function isAdminRequest(request: Request): boolean {
  const token = getAdminSecret();
  const auth = request.headers.get("authorization") || "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (provided && sessionTokensEqual(provided, token)) return true;
  const cookie = cookieValue(request, ADMIN_COOKIE);
  const expectedSession = deriveAdminSessionToken(token);
  return Boolean(cookie) && sessionTokensEqual(cookie, expectedSession);
}

/** Destructive actions require a named Supabase sign-in, not the legacy shared password. */
export function adminActorId(request: Request): string | null {
  if (!isAdminRequest(request)) return null;
  return verifyAdminActorSession(getAdminSecret(), cookieValue(request, ADMIN_ACTOR_COOKIE));
}
