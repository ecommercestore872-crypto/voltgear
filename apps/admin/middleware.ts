import { NextResponse, type NextRequest } from "next/server";

import { getAdminSecret } from "@/lib/admin";
import { isAdminPublicPath } from "@/lib/admin-public-paths";
import { ADMIN_COOKIE } from "@/lib/db/publish";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || isAdminPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie !== getAdminSecret()) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};