import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  discardAdminOrderEmails,
  editorOrderEmails,
  getAdminSettings,
  publishAdminOrderEmails,
  saveAdminOrderEmails,
} from "@/lib/db/admin-store";
import { parseOrderEmailConfig } from "@/lib/order-email-cms-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await getAdminSettings();
  return NextResponse.json({ config: editorOrderEmails(row as Record<string, unknown> | null) });
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const config = parseOrderEmailConfig(body?.doc ?? {});
  let result;
  if (action === "publish") result = await publishAdminOrderEmails(config);
  else if (action === "discard") result = await discardAdminOrderEmails();
  else result = await saveAdminOrderEmails(config);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
