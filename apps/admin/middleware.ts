import { NextResponse, type NextRequest } from "next/server";

import { isAdminPublicPath } from "@/lib/admin-public-paths";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";
import { resolveAdminSecretForMiddleware } from "@/lib/deploy-rules";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || isAdminPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = resolveAdminSecretForMiddleware();
  if (!secret || cookie !== secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};