import { NextResponse } from "next/server";

import { createContactSubmission } from "@/lib/db/inbox-store";
import { takePublicPostLimit } from "@/lib/public-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "contact");
    if (!limited.ok) {
      return NextResponse.json({ error: limited.error }, { status: limited.status });
    }

    const body = await request.json().catch(() => null);
    const result = await createContactSubmission({
      name: body?.name,
      email: body?.email,
      subject: body?.subject,
      message: body?.message,
      kind: body?.kind,
      isDemo: Boolean(body?.isDemo),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `New inbox message (${body?.kind === "complaint" ? "complaint" : "contact"})\nName: ${body?.name}\nEmail: ${body?.email}\nSubject: ${body?.subject ?? "-"}\nMessage: ${body?.message}`,
        }),
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to process message." }, { status: 500 });
  }
}
