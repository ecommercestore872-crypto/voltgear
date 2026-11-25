import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { clearWhatsAppAttention } from "@/lib/whatsapp-confirm";

export const dynamic = "force-dynamic";

export const POST = withAdminApiObservability(
  "POST /api/admin/orders/:orderId/wa-handled",
  async (request: Request, { params }: { params: Promise<{ orderId: string }> }) => {
    if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orderId = (await params).orderId?.trim();
    if (!orderId) return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
    await clearWhatsAppAttention(orderId);
    return NextResponse.json({ ok: true });
  },
);
