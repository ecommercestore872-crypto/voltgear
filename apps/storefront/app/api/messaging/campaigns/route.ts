import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { listCampaigns } from "@/lib/message-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: list all message campaigns with their delivery totals. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}
