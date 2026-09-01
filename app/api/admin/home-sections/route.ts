import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { saveAdminHomeSections } from "@/lib/db/admin-store";
import { normalizeHomeSections } from "@/lib/db/home-section-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const sections = normalizeHomeSections(body?.sections);
  const result = await saveAdminHomeSections(sections);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, sections: result.sections });
}
