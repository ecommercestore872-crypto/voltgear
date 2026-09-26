import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createAdminTestimonial,
  listAdminTestimonials,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const testimonials = await listAdminTestimonials();
  return NextResponse.json({ testimonials });
}

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await createAdminTestimonial(body?.doc ?? body ?? {});
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/testimonials", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/testimonials", POSTHandler);
