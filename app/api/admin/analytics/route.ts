import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { loadAnalyticsBundle } from "@/lib/db/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const bundle = await loadAnalyticsBundle({
      preset: url.searchParams.get("preset") ?? "last30",
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return NextResponse.json(bundle);
  } catch (err) {
    console.error("[admin/analytics]", err);
    return NextResponse.json(
      { error: "Could not load analytics." },
      { status: 500 },
    );
  }
}
