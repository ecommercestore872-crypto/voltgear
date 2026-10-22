import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { parseInboxKind, parseInboxStatus } from "@/lib/db/inbox-rules";
import { listContactSubmissionsPage } from "@/lib/db/inbox-store";
import { inboxListFilters } from "@/lib/inbox-pagination-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const statusParam = url.searchParams.get("status");
  if (kindParam && kindParam !== "all" && kindParam !== "contact" && kindParam !== "complaint") {
    return NextResponse.json({ error: "Invalid inbox kind." }, { status: 400 });
  }
  if (statusParam && statusParam !== "all" && !parseInboxStatus(statusParam)) {
    return NextResponse.json({ error: "Invalid inbox status." }, { status: 400 });
  }
  const kind =
    kindParam === "contact" || kindParam === "complaint"
      ? parseInboxKind(kindParam)
      : undefined;
  const status = statusParam
    ? (parseInboxStatus(statusParam) ?? undefined)
    : undefined;

  try {
    const result = await listContactSubmissionsPage(inboxListFilters({
      kind, status, q: url.searchParams.get("q"), page: url.searchParams.get("page"),
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[inbox] list failed", error);
    return NextResponse.json(
      { error: "Inbox is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export const GET = withAdminApiObservability("GET /api/admin/inbox", GETHandler);
