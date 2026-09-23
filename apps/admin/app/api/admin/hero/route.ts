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

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const hero = await getAdminHero();
  return NextResponse.json({ hero });
}

export async function PATCH(request: Request) {
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
