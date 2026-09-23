import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { normalizePhone, sendBulk } from "@/lib/messaging";
import { createCampaign } from "@/lib/message-store";
import type { MessageRecipient } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send a single or bulk message.
 *   POST /api/messaging/send
 *   Authorization: Bearer <ADMIN_TOKEN>
 *   { "text": "…", "name"?: "campaign name", "recipients": [{phone, name?}, …] }
 *
 * Persists a campaign with a per-recipient delivery report and returns the
 * full result so the UI can show send status immediately.
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const campaignName = body?.name ? String(body.name) : undefined;
  const rawRecipients = Array.isArray(body?.recipients) ? body.recipients : [];

  if (!text) {
    return NextResponse.json(
      { error: "Message text is required." },
      { status: 400 },
    );
  }
  if (!rawRecipients.length) {
    return NextResponse.json(
      { error: "Choose at least one recipient." },
      { status: 400 },
    );
  }
  if (text.length > 4096) {
    return NextResponse.json(
      { error: "Message is too long (max 4096 characters)." },
      { status: 400 },
    );
  }

  const seen = new Set<string>();
  const recipients: { phone: string; name?: string }[] = [];
  for (const r of rawRecipients) {
    const phone = normalizePhone(String(r?.phone ?? ""));
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    recipients.push({ phone, name: r?.name ? String(r.name) : undefined });
  }

  if (!recipients.length) {
    return NextResponse.json(
      { error: "No valid Pakistani phone numbers in the selection." },
      { status: 400 },
    );
  }

  const results = await sendBulk(recipients, text);

  const stored: MessageRecipient[] = results.map((r) => ({
    phone: r.phone,
    ...(recipients.find((x) => x.phone === r.phone)?.name
      ? { name: recipients.find((x) => x.phone === r.phone)!.name }
      : {}),
    status: r.status,
    ...(r.messageId ? { messageId: r.messageId } : {}),
    ...(r.error ? { error: r.error } : {}),
  }));

  const campaignId = await createCampaign(campaignName, text, stored);

  const sent = stored.filter((r) => r.status === "sent").length;
  const failed = stored.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    ok: true,
    campaignId,
    totals: { total: stored.length, sent, failed },
    results: stored,
  });
}
