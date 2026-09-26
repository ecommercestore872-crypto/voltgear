import { NextResponse } from "next/server";

import { upsertEmailSuppression } from "@/lib/db/email-suppression-store";
import {
  parseResendWebhookPayload,
  suppressionReasonFromResendKind,
  verifySvixWebhookSignature,
} from "@/lib/resend-webhook-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend → Webhooks → endpoint (admin app, low shop CPU).
 * Subscribe to email.bounced + email.complained in Resend dashboard.
 */
export async function GET() {
  const configured = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  return NextResponse.json({
    ok: true,
    service: "resend-webhook",
    configured,
    note: "Resend delivers events via POST with Svix signatures.",
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";
  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (production && !secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET missing in production");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (secret) {
    const ok = verifySvixWebhookSignature({
      rawBody,
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseResendWebhookPayload(body);
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const reason = suppressionReasonFromResendKind(parsed.kind);
  for (const email of parsed.emails) {
    await upsertEmailSuppression(email, reason);
  }

  console.info(
    "[resend-webhook]",
    JSON.stringify({
      kind: parsed.kind,
      count: parsed.emails.length,
      reason,
      ts: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ok: true, suppressed: parsed.emails.length });
}
