import { NextResponse, type NextRequest } from "next/server";

import { getAdminSecret } from "@/lib/admin";
import { ADMIN_COOKIE } from "@/lib/db/publish";
import { apexPublicUrl, shouldRedirectWwwHost } from "@/lib/seo-rules";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (shouldRedirectWwwHost(host)) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(apexPublicUrl(pathname, search), 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const next = NextResponse.next({ request: { headers: requestHeaders } });

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return next;
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie === getAdminSecret()) return next;

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
