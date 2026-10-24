import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { collectionMutationRequest } from "@/lib/collection-input";
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
  let input;
  try { input = collectionMutationRequest(body, "create"); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid collection." }, { status: 400 }); }
  const result = await createAdminCollection(input);
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
