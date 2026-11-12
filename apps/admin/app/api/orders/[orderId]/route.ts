import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest, namedAdminActor } from "@/lib/admin";
import { deleteOrder } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function DELETEHandler(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorId = namedAdminActor(request);
  if (!actorId) return NextResponse.json({ error: "Sign in with a named admin account to delete an order." }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const orderId = (await params).orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== orderId) {
    return NextResponse.json({ error: "Type the exact order ID to confirm deletion." }, { status: 400 });
  }

  const result = await deleteOrder(orderId, actorId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = withAdminApiObservability("DELETE /api/orders/:orderId", DELETEHandler);
