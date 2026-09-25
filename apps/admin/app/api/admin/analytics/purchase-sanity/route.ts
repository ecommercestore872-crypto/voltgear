import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { ANALYTICS_PRESETS, type AnalyticsPreset } from "@/lib/db/analytics-rules";
import { fetchPurchaseSanityOrderRows } from "@/lib/db/purchase-sanity-store";
import { buildPurchaseSanityReport } from "@/lib/purchase-sanity-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePreset(raw: string | null): AnalyticsPreset {
  return ANALYTICS_PRESETS.includes(raw as AnalyticsPreset)
    ? (raw as AnalyticsPreset)
    : "last7";
}

function parseOptionalCount(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * GET /api/admin/analytics/purchase-sanity?preset=last7&tiktok=12&meta=10
 * Compare admin placed orders to TikTok/Meta Purchase counts you paste from Ads dashboards.
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const preset = parsePreset(url.searchParams.get("preset"));
  const tiktokPurchases = parseOptionalCount(url.searchParams.get("tiktok"));
  const metaPurchases = parseOptionalCount(url.searchParams.get("meta"));

  const rows = await fetchPurchaseSanityOrderRows();
  const report = buildPurchaseSanityReport({
    preset,
    rows,
    tiktokPurchases,
    metaPurchases,
  });

  return NextResponse.json({
    ...report,
    hints: {
      tiktok:
        "TikTok Events Manager → your pixel → Purchase events for the same date range (PKR).",
      meta: "Meta Events Manager → Purchase (website) for the same date range.",
      vercel:
        "Optional: filter shop logs `[purchase-track]` sent vs placed orders in the range.",
    },
  });
}
