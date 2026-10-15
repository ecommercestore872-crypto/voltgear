import { NextResponse, type NextRequest } from "next/server";

import { isAdminApiPublicPath } from "@/lib/admin-api-public-paths";
import { isAdminPublicPath } from "@/lib/admin-public-paths";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";
import { deriveAdminSessionToken, sessionTokensEqual } from "@/lib/admin-session";
import { resolveAdminSecretForMiddleware } from "@/lib/deploy-rules";

function requiresAdminSession(pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return !isAdminPublicPath(pathname);
  }
  if (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/messaging/") ||
    pathname.startsWith("/api/orders/") ||
    pathname === "/api/indexnow"
  ) {
    return !isAdminApiPublicPath(pathname);
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!requiresAdminSession(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = resolveAdminSecretForMiddleware();
  const expectedSession = secret ? await deriveAdminSessionToken(secret) : "";
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.replace(/^Bearer\s+/i, "");
  const hasCookieSession = Boolean(cookie) && sessionTokensEqual(cookie ?? "", expectedSession);
  const hasBearerSession = Boolean(secret && bearer) && sessionTokensEqual(bearer, secret);
  if (!hasCookieSession && !hasBearerSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/messaging/:path*",
    "/api/orders/:path*",
    "/api/indexnow",
  ],
};
