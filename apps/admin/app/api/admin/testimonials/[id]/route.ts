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

type Ctx = { params: { id: string } };

export async function GET(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const testimonial = await getAdminTestimonial(params.id);
  if (!testimonial)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ testimonial });
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const doc = body?.doc;
  let result;
  if (action === "publish")
    result = await publishAdminTestimonial(params.id, doc);
  else if (action === "unpublish")
    result = await unpublishAdminTestimonial(params.id);
  else if (action === "discard")
    result = await discardAdminTestimonialDraft(params.id);
  else result = await saveAdminTestimonial(params.id, doc);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export async function DELETE(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteAdminTestimonial(params.id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}
