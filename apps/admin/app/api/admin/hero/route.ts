import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  discardAdminHeroDraft,
  getAdminHero,
  publishAdminHero,
  saveAdminHero,
  unpublishAdminHero,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const hero = await getAdminHero();
  return NextResponse.json({ hero });
}

async function PATCHHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const doc = body?.doc ?? {};
  let result;
  if (action === "publish") result = await publishAdminHero(doc);
  else if (action === "unpublish") result = await unpublishAdminHero();
  else if (action === "discard") result = await discardAdminHeroDraft();
  else result = await saveAdminHero(doc);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/hero", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/hero", PATCHHandler);
