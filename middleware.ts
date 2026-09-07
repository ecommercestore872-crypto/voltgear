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

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie === getAdminSecret()) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
