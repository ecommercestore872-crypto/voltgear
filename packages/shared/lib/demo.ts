import { cookies } from "next/headers";

import {
  DEMO_COOKIE,
  DEMO_COOKIE_VALUE,
} from "@/lib/db/demo-rules";

export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function cookieValue(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function isDemoRequest(request: Request): boolean {
  return cookieValue(request, DEMO_COOKIE) === DEMO_COOKIE_VALUE;
}

export function isDemoSession(): boolean {
  return cookies().get(DEMO_COOKIE)?.value === DEMO_COOKIE_VALUE;
}
