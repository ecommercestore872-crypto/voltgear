import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { listNewsletterSubscribers } from "@/lib/db/newsletter-store";
import { newsletterCsv } from "@/lib/newsletter-rules";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const subscribers = await listNewsletterSubscribers();
    const format = new URL(request.url).searchParams.get("format");
    if (format === "csv") {
      return new NextResponse(newsletterCsv(subscribers), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=newsletter-subscribers.csv",
        },
      });
    }
    return NextResponse.json({ subscribers });
  } catch {
    return NextResponse.json(
      { error: "Newsletter table is missing. Push migration 20260905010000_newsletter_subscribers.sql." },
      { status: 503 }
    );
  }
}
