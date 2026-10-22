import { ADMIN_COOKIE } from "@/lib/admin-cookie";
import { deriveAdminSessionToken, sessionTokensEqual } from "@/lib/admin-session";
import { resolveAdminSecret } from "@/lib/deploy-rules";
import { isTrustedAdminMutationOrigin } from "@/lib/admin-origin-rules";

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
  // SameSite=Lax does not protect against a compromised sibling origin. Browser
  // cookie mutations must prove their exact origin; bearer integrations are
  // authenticated above and do not rely on automatically attached credentials.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    if (!isTrustedAdminMutationOrigin(request)) return false;
  }
  const cookie = cookieValue(request, ADMIN_COOKIE);
  const expectedSession = deriveAdminSessionToken(token);
  return Boolean(cookie) && sessionTokensEqual(cookie, expectedSession);
}
