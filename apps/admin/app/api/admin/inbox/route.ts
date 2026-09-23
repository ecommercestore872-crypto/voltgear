import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { parseInboxKind, parseInboxStatus } from "@/lib/db/inbox-rules";
import { listContactSubmissions } from "@/lib/db/inbox-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const statusParam = url.searchParams.get("status");
  const kind =
    kindParam === "contact" || kindParam === "complaint"
      ? parseInboxKind(kindParam)
      : undefined;
  const status = statusParam
    ? (parseInboxStatus(statusParam) ?? undefined)
    : undefined;

  try {
    const items = await listContactSubmissions({ kind, status });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[inbox] list failed", error);
    return NextResponse.json(
      { error: "Inbox is not ready. Push the contact_submissions migration." },
      { status: 503 },
    );
  }
}
