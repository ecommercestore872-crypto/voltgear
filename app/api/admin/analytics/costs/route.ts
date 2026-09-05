import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getAnalyticsAdSpend, saveAnalyticsAdSpend, saveProductCosts } from "@/lib/db/admin-store";
import { parseCoachCostItems, parseCoachFees } from "@/lib/db/analytics-coach-rules";
import { parseAdSpendStore, upsertUnitFees } from "@/lib/db/analytics-profit-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseCoachCostItems(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const fees = parseCoachFees(body);
  const hasFees = fees.packingFee != null || fees.codFee != null;
  if (!parsed.items.length && !hasFees) {
    return NextResponse.json({ error: "Enter at least one cost or a packing/COD fee." }, { status: 400 });
  }
  let saved = 0;
  if (parsed.items.length) {
    const costs = await saveProductCosts(parsed.items);
    if (!costs.ok) return NextResponse.json({ error: costs.error }, { status: costs.status });
    saved = costs.saved;
  }
  if (hasFees) {
    const current = await getAnalyticsAdSpend();
    const next = upsertUnitFees(current, fees);
    const stored = await saveAnalyticsAdSpend(parseAdSpendStore(next));
    if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status });
  }
  return NextResponse.json({ ok: true, saved });
}
