import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createAdminCollection,
  listAdminCollections,
} from "@/lib/db/collection-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const collections = await listAdminCollections();
    return NextResponse.json({ collections });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Collections table missing. Push migration 20260901040000_collections.sql.",
      },
      { status: 503 },
    );
  }
}

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await createAdminCollection(body ?? {});
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ collection: result.collection }, { status: 201 });
}

export const GET = withAdminApiObservability("GET /api/admin/collections", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/collections", POSTHandler);
