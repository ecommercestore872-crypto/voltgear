import { NextResponse } from "next/server";

import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { isCronAuthorized } from "@/lib/deploy-rules";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps admin serverless + Supabase client warm. Vercel Cron:
 *   GET /api/admin/warm  Authorization: Bearer CRON_SECRET
 */
async function GETHandler(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t0 = performance.now();
  try {
    const client = getServiceClient({ admin: true });
    await client.from("settings").select("id").limit(1);
  } catch {
    /* still return ok — primary goal is cold-start mitigation */
  }
  return NextResponse.json({
    ok: true,
    ms: Math.round(performance.now() - t0),
  });
}

export const GET = withAdminApiObservability("GET /api/admin/warm", GETHandler);
