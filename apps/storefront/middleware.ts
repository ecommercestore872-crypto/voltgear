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

  return NextResponse.next();
}

/** Edge only on checkout (geo) — not every page view. */
export const config = {
  matcher: ["/checkout/:path*", "/api/checkout/:path*"],
};
