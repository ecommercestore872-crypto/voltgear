import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { saveCityIntros } from "@/lib/db/city-seo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function PUTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const raw = body?.intros;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const intros: Record<string, string> = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    intros[slug] = typeof value === "string" ? value : "";
  }
  const result = await saveCityIntros(intros);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const PUT = withAdminApiObservability("PUT /api/admin/city-seo", PUTHandler);
