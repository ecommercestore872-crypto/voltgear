import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createSavedAnalyticsReport,
  listSavedAnalyticsReports,
} from "@/lib/db/admin-store";
import { parseAnalyticsQuery } from "@/lib/db/analytics-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reports = await listSavedAnalyticsReports();
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const parsed = parseAnalyticsQuery(body?.query ?? body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }
  const result = await createSavedAnalyticsReport(
    name,
    parsed.query as unknown as Record<string, unknown>,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
