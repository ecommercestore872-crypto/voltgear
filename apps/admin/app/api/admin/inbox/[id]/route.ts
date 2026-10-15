import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  getContactSubmission,
  updateContactSubmission,
} from "@/lib/db/inbox-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let item;
  try {
    item = await getContactSubmission(params.id);
  } catch (error) {
    console.error("[inbox] load failed", error);
    return NextResponse.json({ error: "Inbox is temporarily unavailable." }, { status: 503 });
  }
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ item });
}

async function PATCHHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
  }
  const patch: { status?: unknown; adminNote?: unknown } = {};
  if (Object.prototype.hasOwnProperty.call(body, "status")) patch.status = body.status;
  if (Object.prototype.hasOwnProperty.call(body, "adminNote")) patch.adminNote = body.adminNote;
  const result = await updateContactSubmission(params.id, patch);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ item: result.item });
}

export const GET = withAdminApiObservability("GET /api/admin/inbox/:id", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/inbox/:id", PATCHHandler);
