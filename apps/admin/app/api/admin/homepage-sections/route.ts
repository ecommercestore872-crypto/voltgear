import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createAdminHomepageSection,
  listAdminHomepageSections,
  reorderAdminHomepageSections,
} from "@/lib/db/homepage-sections-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sections = await listAdminHomepageSections();
  return NextResponse.json({ sections });
}

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await createAdminHomepageSection(body ?? {});
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json(result);
}

async function PATCHHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (body?.action === "reorder" && Array.isArray(body?.orderedIds)) {
    const result = await reorderAdminHomepageSections(body.orderedIds);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Invalid patch request" }, { status: 400 });
}

export const GET = withAdminApiObservability("GET /api/admin/homepage-sections", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/homepage-sections", POSTHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/homepage-sections", PATCHHandler);
