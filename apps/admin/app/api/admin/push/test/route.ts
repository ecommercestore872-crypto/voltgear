import { NextResponse } from "next/server";
import { after } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { countSubscriptions, sendAdminPush } from "@/lib/admin-push";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Sends a test alert after a short delay, so the owner can lock the phone first. */
export const POST = withAdminApiObservability("POST /api/admin/push/test", async (request: Request) => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const devices = await countSubscriptions();
  if (devices > 0) {
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await sendAdminPush({
        title: "Test alert",
        body: "Lock-screen alerts work. New orders will look like this.",
        url: "/admin/orders",
        tag: "test",
      });
    });
  }
  return NextResponse.json({ ok: true, devices });
});
