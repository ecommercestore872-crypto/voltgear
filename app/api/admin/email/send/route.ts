import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { sendMarketingEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin marketing email: single or bulk (batched).
 * POST { to: string | string[], subject, text, html?, confirmPermission?: boolean }
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const html = typeof body?.html === "string" ? body.html.trim() : undefined;
  const confirmPermission = Boolean(body?.confirmPermission);

  const rawTo = body?.to;
  const recipients = Array.isArray(rawTo)
    ? rawTo.map((t) => String(t).trim()).filter(Boolean)
    : typeof rawTo === "string" && rawTo.trim()
      ? [rawTo.trim()]
      : [];

  if (!subject || !text) {
    return NextResponse.json(
      { error: "Subject and message text are required." },
      { status: 400 },
    );
  }
  if (!recipients.length) {
    return NextResponse.json(
      { error: "Enter at least one recipient email." },
      { status: 400 },
    );
  }
  if (recipients.length > 1 && !confirmPermission) {
    return NextResponse.json(
      {
        error:
          "Bulk send requires confirmPermission: true (you confirm you have permission to email these people).",
      },
      { status: 400 },
    );
  }
  for (const email of recipients) {
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: `Invalid email: ${email}` },
        { status: 400 },
      );
    }
  }

  const result = await sendMarketingEmail({
    recipients,
    subject,
    text,
    html,
  });

  return NextResponse.json(result);
}
