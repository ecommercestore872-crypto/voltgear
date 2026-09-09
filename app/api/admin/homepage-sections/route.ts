import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createAdminHomepageSection,
  listAdminHomepageSections,
  reorderAdminHomepageSections,
} from "@/lib/db/homepage-sections-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sections = await listAdminHomepageSections();
  return NextResponse.json({ sections });
}

export async function POST(request: Request) {
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

export async function PATCH(request: Request) {
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
