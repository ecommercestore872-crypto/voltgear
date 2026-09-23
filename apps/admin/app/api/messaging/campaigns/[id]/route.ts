import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getCampaign } from "@/lib/message-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: full delivery report for a single campaign. */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const campaign = await getCampaign(params.id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}
