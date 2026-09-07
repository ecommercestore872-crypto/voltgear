import { NextResponse } from "next/server";

import { demoCookieOptions } from "@/lib/demo";
import {
  DEMO_COOKIE,
  DEMO_COOKIE_VALUE,
  isValidDemoLogin,
} from "@/lib/db/demo-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      { error: "Demo login is disabled in production." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const username = body?.username ? String(body.username) : "";
  const password = body?.password ? String(body.password) : "";

  if (!isValidDemoLogin(username, password)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, DEMO_COOKIE_VALUE, demoCookieOptions());
  return res;
}
