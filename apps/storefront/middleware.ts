import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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

  if (pathname !== "/") {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (request.cookies.get("visitor-city")) {
    return response;
  }

  const city = request.headers.get("x-vercel-ip-city");
  if (city) {
    response.cookies.set("visitor-city", encodeURIComponent(city), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: true,
      sameSite: "lax",
    });
  }

  return response;
}

/** Edge only on checkout (geo) and home (one-time city cookie) — not every page view. */
export const config = {
  matcher: ["/checkout/:path*", "/api/checkout/:path*", "/"],
};
