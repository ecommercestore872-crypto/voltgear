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

  // 1. Geo-Fencing Checkout: Block international bots from spamming COD orders.
  if (pathname.startsWith("/checkout") || pathname.startsWith("/api/checkout")) {
    const country = request.headers.get("x-vercel-ip-country");
    // If Vercel detects a location and it is NOT Pakistan, aggressively bounce them.
    if (country && country !== "PK") {
      const lockOutUrl = request.nextUrl.clone();
      lockOutUrl.pathname = "/";
      lockOutUrl.searchParams.set("error", "geo-blocked");
      return NextResponse.redirect(lockOutUrl);
    }
  }

  let response = NextResponse.next();

  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    const city = request.headers.get("x-vercel-ip-city");
    if (city) {
      response.cookies.set("visitor-city", encodeURIComponent(city), { path: "/", secure: true, sameSite: "lax" });
    }
  } else {
    const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
    if (cookie !== getAdminSecret()) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      response = NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
