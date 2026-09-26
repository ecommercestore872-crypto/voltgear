import { NextResponse } from "next/server";

import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { isAdminRequest } from "@/lib/admin";
import {
  discardAdminSettingsDraft,
  getAdminSettings,
  publishAdminSettings,
  saveAdminSettings,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAdminApiObservability(
  "GET /api/admin/settings",
  async (request: Request) => {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await getAdminSettings();
    return NextResponse.json({ settings });
  },
);

export const PATCH = withAdminApiObservability(
  "PATCH /api/admin/settings",
  async (request: Request) => {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    const action = String(body?.action ?? "save");
    const doc = body?.doc ?? {};
    let result;
    if (action === "publish") result = await publishAdminSettings(doc);
    else if (action === "discard") result = await discardAdminSettingsDraft();
    else result = await saveAdminSettings(doc);
    if (!result.ok)
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    return NextResponse.json(result);
  },
);
