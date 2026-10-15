import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { listNewsletterSubscribers, unsubscribeNewsletterSubscriber } from "@/lib/db/newsletter-store";
import { newsletterCsv } from "@/lib/newsletter-rules";

export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const subscribers = await listNewsletterSubscribers();
    const format = new URL(request.url).searchParams.get("format");
    if (format === "csv") {
      return new NextResponse(newsletterCsv(subscribers.filter((row) => row.status === "subscribed")), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            "attachment; filename=newsletter-subscribers.csv",
        },
      });
    }
    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("[newsletter] list failed", error);
    return NextResponse.json(
      {
        error:
          "Newsletter data is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}

export const GET = withAdminApiObservability("GET /api/admin/newsletter", GETHandler);

async function PATCHHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || body.action !== "unsubscribe") {
    return NextResponse.json({ error: "A subscriber id and unsubscribe action are required." }, { status: 400 });
  }
  const result = await unsubscribeNewsletterSubscriber(body.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ subscriber: result.subscriber });
}

export const PATCH = withAdminApiObservability("PATCH /api/admin/newsletter", PATCHHandler);
