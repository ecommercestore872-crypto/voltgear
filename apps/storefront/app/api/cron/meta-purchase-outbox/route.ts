import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/deploy-rules";
import { processMetaPurchaseOutbox } from "@/lib/meta-purchase-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.META_OUTBOX_WORKER_ENABLED !== "true") {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const result = await processMetaPurchaseOutbox(5);
  return NextResponse.json({ ok: true, ...result });
}
