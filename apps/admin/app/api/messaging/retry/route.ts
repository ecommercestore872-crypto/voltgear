import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { sendBulk } from "@/lib/messaging";
import { getCampaign, updateCampaignResults } from "@/lib/message-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retry only the failed recipients of a previous campaign.
 *   POST /api/messaging/retry   { "campaignId": "…" }
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const campaignId = body?.campaignId ? String(body.campaignId) : "";
  if (!campaignId) {
    return NextResponse.json(
      { error: "campaignId is required." },
      { status: 400 },
    );
  }

  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const failed = campaign.recipients.filter((r) => r.status === "failed");
  if (!failed.length) {
    return NextResponse.json({ ok: true, resent: 0 });
  }

  const results = await sendBulk(
    failed.map((r) => ({ phone: r.phone, name: r.name })),
    campaign.text,
  );

  const byPhone = new Map(results.map((r) => [r.phone, r]));
  const updated = campaign.recipients.map((r) => {
    const res = byPhone.get(r.phone);
    if (!res) return r;
    return {
      ...r,
      status: res.status,
      ...(res.messageId ? { messageId: res.messageId } : {}),
      ...(res.error ? { error: res.error } : {}),
      ...(res.status === "sent"
        ? { sentAt: new Date().toISOString(), error: undefined }
        : {}),
    };
  });

  await updateCampaignResults(campaignId, updated);

  const resent = results.filter((r) => r.status === "sent").length;
  const stillFailed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    ok: true,
    resent,
    stillFailed,
    results,
  });
}
