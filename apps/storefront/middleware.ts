import { NextResponse, type NextRequest } from "next/server";

import { apexPublicUrl, shouldRedirectWwwHost } from "@/lib/seo-rules";

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
