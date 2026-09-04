import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { parseAutopilotConfig } from "@/lib/autopilot/config";
import { runAutoDispatch } from "@/lib/autopilot/dispatch-run";
import { runAutoRescue } from "@/lib/autopilot/rescue-run";
import { settleFromCsv } from "@/lib/autopilot/settlement-run";
import { editorAutopilot, getAdminSettings, publishAdminAutopilot } from "@/lib/db/admin-store";
import { getAllOrders } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await getAdminSettings();
  return NextResponse.json({ config: editorAutopilot(row as Record<string, unknown> | null) });
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await publishAdminAutopilot(parseAutopilotConfig(body ?? {}));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const text = file && typeof file === "object" && "text" in file ? await (file as File).text() : "";
    const batch = settleFromCsv(text, await getAllOrders());
    return NextResponse.json({
      ok: true,
      status: batch.status,
      totalParcels: batch.totalParcels,
      totalCodCollected: batch.totalCodCollected,
      items: batch.items.slice(0, 40),
    });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  if (action === "dispatch") return NextResponse.json({ ok: true, results: await runAutoDispatch() });
  if (action === "rescue") return NextResponse.json({ ok: true, results: await runAutoRescue() });
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
