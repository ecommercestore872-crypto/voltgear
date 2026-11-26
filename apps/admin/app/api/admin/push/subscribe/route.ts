import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { removeSubscription, saveSubscription } from "@/lib/admin-push";
import { parsePushEndpoint, parsePushSubscription } from "@/lib/admin-push-rules";

export const dynamic = "force-dynamic";

export const POST = withAdminApiObservability("POST /api/admin/push/subscribe", async (request: Request) => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = parsePushSubscription(await request.json().catch(() => null));
  if (!sub) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await saveSubscription(sub, request.headers.get("user-agent") ?? "");
  return NextResponse.json({ ok: true });
});

export const DELETE = withAdminApiObservability("DELETE /api/admin/push/subscribe", async (request: Request) => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const endpoint = parsePushEndpoint(await request.json().catch(() => null));
  if (!endpoint) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
});
