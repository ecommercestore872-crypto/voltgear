import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminTestimonial,
  discardAdminTestimonialDraft,
  getAdminTestimonial,
  publishAdminTestimonial,
  saveAdminTestimonial,
  unpublishAdminTestimonial,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const testimonial = await getAdminTestimonial((await params).id);
  if (!testimonial)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ testimonial });
}

async function PATCHHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const doc = body?.doc;
  let result;
  if (action === "publish")
    result = await publishAdminTestimonial((await params).id, doc);
  else if (action === "unpublish")
    result = await unpublishAdminTestimonial((await params).id);
  else if (action === "discard")
    result = await discardAdminTestimonialDraft((await params).id);
  else result = await saveAdminTestimonial((await params).id, doc);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

async function DELETEHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteAdminTestimonial((await params).id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/testimonials/:id", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/testimonials/:id", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/testimonials/:id", DELETEHandler);
