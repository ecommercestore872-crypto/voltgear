import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { listPostExTrackingSnapshots } from "@/lib/postex-tracking-ledger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orderId = (await context.params).orderId?.trim();
  if (!orderId) return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  const history = await listPostExTrackingSnapshots(orderId);
  if (!history) return NextResponse.json({ error: "Tracking history unavailable" }, { status: 404 });
  return NextResponse.json(history, { headers: { "Cache-Control": "no-store" } });
}
