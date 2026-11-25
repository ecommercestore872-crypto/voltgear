import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { bookOrderOnPostEx } from "@/lib/postex-book-order-run";

async function POSTHandler(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();
    const result = await bookOrderOnPostEx(orderId);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    console.error("[PostEx Book Route Error]: unexpected failure");
    return NextResponse.json({ error: "Could not process PostEx booking." }, { status: 500 });
  }
}

export const POST = withAdminApiObservability("POST /api/admin/postex/book", POSTHandler);
