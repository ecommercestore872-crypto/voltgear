import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  listReviewSubmissions,
  moderateReview,
  deleteReview,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reviews = await listReviewSubmissions();
  return NextResponse.json({ reviews });
}

async function PATCHHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const action = body?.action === "reject" ? "reject" : "approve";
  if (!id)
    return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  const result = await moderateReview(id, action);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

async function DELETEHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  if (!id)
    return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  const result = await deleteReview(id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json({ ok: true });
}

export const GET = withAdminApiObservability("GET /api/admin/reviews", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/reviews", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/reviews", DELETEHandler);
