import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/deploy-rules";
import { listOrderIdsForPostExSync } from "@/lib/db/store";
import { syncPostExOrdersBatch } from "@/lib/postex-shopper-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps shop order status aligned with PostEx (processing/shipped parcels).
 * Vercel Cron: GET /api/cron/postex-sync with Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.POSTEX_API_TOKEN?.trim()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "POSTEX_API_TOKEN not configured",
    });
  }

  const orderIds = await listOrderIdsForPostExSync(50);
  const { synced, failed } = await syncPostExOrdersBatch(orderIds);

  return NextResponse.json({
    ok: true,
    queued: orderIds.length,
    synced,
    failed,
  });
}
