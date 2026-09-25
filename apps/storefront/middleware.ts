import { NextResponse, type NextRequest } from "next/server";

import { apexPublicUrl, shouldRedirectWwwHost } from "@/lib/seo-rules";

const SKIP_CITY_COOKIE_PREFIXES = ["/api/", "/_next/"] as const;

function needsVisitorCityCookie(pathname: string): boolean {
  if (pathname === "/favicon.ico") return false;
  return !SKIP_CITY_COOKIE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (shouldRedirectWwwHost(host)) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(apexPublicUrl(pathname, search), 308);
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/checkout") || pathname.startsWith("/api/checkout")) {
    const country = request.headers.get("x-vercel-ip-country");
    if (country && country !== "PK") {
      const lockOutUrl = request.nextUrl.clone();
      lockOutUrl.pathname = "/";
      lockOutUrl.searchParams.set("error", "geo-blocked");
      return NextResponse.redirect(lockOutUrl);
    }
  }

  if (!needsVisitorCityCookie(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const city = request.headers.get("x-vercel-ip-city");
  if (city) {
    response.cookies.set("visitor-city", encodeURIComponent(city), {
      path: "/",
      secure: true,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/api/checkout/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
