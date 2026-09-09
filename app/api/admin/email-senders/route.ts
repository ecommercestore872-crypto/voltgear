import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  discardAdminEmailSenders,
  editorEmailSenders,
  getAdminSettings,
  publishAdminEmailSenders,
  saveAdminEmailSenders,
} from "@/lib/db/admin-store";
import {
  emailSenderDocError,
  parseEmailSenderConfig,
} from "@/lib/email-sender-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await getAdminSettings();
  return NextResponse.json({
    config: editorEmailSenders(row as Record<string, unknown> | null),
  });
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const invalid = emailSenderDocError(body?.doc ?? {});
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const config = parseEmailSenderConfig(body?.doc ?? {});
  let result;
  if (action === "publish") result = await publishAdminEmailSenders(config);
  else if (action === "discard") result = await discardAdminEmailSenders();
  else result = await saveAdminEmailSenders(config);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}
