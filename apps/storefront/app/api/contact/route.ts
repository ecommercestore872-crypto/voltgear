import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { createContactSubmission } from "@/lib/db/inbox-store";
import { isDemoRequest } from "@/lib/demo";
import { takePublicPostLimit } from "@/lib/public-api-guard";
import { safeWebhookText } from "@/lib/newsletter-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "contact");
    if (!limited.ok) {
      return NextResponse.json(
        { error: limited.error },
        { status: limited.status },
      );
    }

    const body = await request.json().catch(() => null);
    const isDemo = isDemoRequest(request);
    const result = await createContactSubmission({
      name: body?.name,
      email: body?.email,
      subject: body?.subject,
      message: body?.message,
      kind: body?.kind,
      // Never trust a client-supplied sandbox flag.
      isDemo,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.WEBHOOK_URL;
    if (webhookUrl && !isDemo) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3_000),
        body: JSON.stringify({
          text: `New inbox message (${body?.kind === "complaint" ? "complaint" : "contact"})\nName: ${safeWebhookText(body?.name, 120)}\nEmail: ${safeWebhookText(body?.email, 254)}\nSubject: ${safeWebhookText(body?.subject ?? "-", 200)}\nMessage: ${safeWebhookText(body?.message, 5000)}`,
        }),
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to process message." },
      { status: 500 },
    );
  }
}

export const POST = withShopApiObservability("POST /api/contact", POSTHandler);
