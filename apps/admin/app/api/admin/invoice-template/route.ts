import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  discardAdminInvoiceTemplate,
  editorInvoiceTemplate,
  getAdminSettings,
  publishAdminInvoiceTemplate,
  saveAdminInvoiceTemplate,
} from "@/lib/db/admin-store";
import { invoiceTemplateOverrides } from "@/lib/invoice-template-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await getAdminSettings();
  return NextResponse.json({
    config: editorInvoiceTemplate(row as Record<string, unknown> | null),
  });
}

async function PATCHHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const config = invoiceTemplateOverrides(body?.doc ?? {});
  let result;
  if (action === "publish") result = await publishAdminInvoiceTemplate(config);
  else if (action === "discard") result = await discardAdminInvoiceTemplate();
  else result = await saveAdminInvoiceTemplate(config);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/invoice-template", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/invoice-template", PATCHHandler);
