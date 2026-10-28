import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { listNewsletterSubscribersPage, subscribedNewsletterBatches, unsubscribeNewsletterSubscriber } from "@/lib/db/newsletter-store";
import { newsletterCsv } from "@/lib/newsletter-rules";
import { newsletterListFilters } from "@/lib/newsletter-pagination-rules";

export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const status = url.searchParams.get("status");
  if (format !== "csv" && status && !["all", "subscribed", "unsubscribed"].includes(status)) {
    return NextResponse.json({ error: "Invalid subscriber status." }, { status: 400 });
  }
  try {
    if (format === "csv") {
      const batches = subscribedNewsletterBatches();
      // Fetch before sending headers so initial database errors return a 503.
      let first: Awaited<ReturnType<typeof batches.next>> | undefined = await batches.next();
      const encoder = new TextEncoder();
      const header = newsletterCsv([]);
      let headerSent = false;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            if (!headerSent) {
              headerSent = true;
              controller.enqueue(encoder.encode(header));
              return;
            }
            const batch = first ?? await batches.next();
            first = undefined;
            if (batch.done) {
              controller.close();
              return;
            }
            controller.enqueue(encoder.encode(newsletterCsv(batch.value).slice(header.length)));
          } catch (error) {
            console.error("[newsletter] export failed", error);
            controller.error(error);
          }
        },
        async cancel() { await batches.return(undefined); },
      });
      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            "attachment; filename=newsletter-subscribers.csv",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(await listNewsletterSubscribersPage(newsletterListFilters({
      status, q: url.searchParams.get("q"), page: url.searchParams.get("page"),
    })));
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
  if (!(await isAdminRequest(request))) {
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
