import { NextResponse, type NextRequest } from "next/server";

import { isAdminApiPublicPath } from "@/lib/admin-api-public-paths";
import { isAdminPublicPath } from "@/lib/admin-public-paths";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!requiresAdminSession(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = resolveAdminSecretForMiddleware();
  if (!secret || cookie !== secret) {
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
