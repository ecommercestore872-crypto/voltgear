import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createEmailTemplate,
  listEmailTemplates,
} from "@/lib/db/email-template-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[email-templates] list", error);
    return NextResponse.json(
      {
        error: "Templates table not ready. Push the email_templates migration.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await createEmailTemplate({
    name: body?.name,
    subject: body?.subject,
    bodyText: body?.bodyText ?? body?.text,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ template: result.template });
}
