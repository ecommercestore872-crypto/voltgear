import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { listReviewSubmissions, moderateReview, deleteReview } from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reviews = await listReviewSubmissions();
  return NextResponse.json({ reviews });
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const action = body?.action === "reject" ? "reject" : "approve";
  if (!id) return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  const result = await moderateReview(id, action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  const result = await deleteReview(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
