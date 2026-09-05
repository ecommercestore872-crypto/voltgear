import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getAnalyticsAdSpend, saveAnalyticsAdSpend } from "@/lib/db/admin-store";
import { parseAnalyticsPreset } from "@/lib/db/analytics";
import { resolveAnalyticsRange } from "@/lib/db/analytics-rules";
import { parseAdSpendStore, spendForRange, upsertAdSpend } from "@/lib/db/analytics-profit-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Send ad spend for this date range." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const now = new Date();
  const preset = parseAnalyticsPreset(typeof raw.preset === "string" ? raw.preset : "last30");
  const range = resolveAnalyticsRange(preset, now, {
    from: typeof raw.from === "string" ? raw.from : undefined,
    to: typeof raw.to === "string" ? raw.to : undefined,
  });
  const bySource =
    raw.bySource && typeof raw.bySource === "object" && !Array.isArray(raw.bySource)
      ? (raw.bySource as Record<string, unknown>)
      : {};
  const cleaned: Record<string, number> = {};
  for (const [source, value] of Object.entries(bySource)) {
    const amount = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(amount)) cleaned[source] = amount;
  }
  const current = await getAnalyticsAdSpend();
  const next = upsertAdSpend(current, range, cleaned);
  const saved = await saveAnalyticsAdSpend(parseAdSpendStore(next));
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json({ ok: true, range, spend: spendForRange(next, range) });
}
