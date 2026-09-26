import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/deploy-rules";
import { withShopApiObservability } from "@/lib/shop-api-observability";

import {
  sendAbandonedCartEmail,
  sendPostPurchaseEmail,
  sendWinbackEmail,
} from "@/lib/email";
import { listWinbackCandidates } from "@/lib/db/winback-candidates";
import { winbackInactiveCutoffIso } from "@/lib/db/flows-winback-rules";
import {
  enqueueEmailEvent,
  getPendingEmailEvents,
  markEmailSent,
  recentWinbackExists,
} from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email flow runner. Call this from any scheduler on an interval:
 *
 *   Vercel Cron:  GET /api/flows with Authorization: Bearer CRON_SECRET
 *   (`crons` in vercel.json; Hobby allows once per day)
 *
 * Sends every due queued event and enqueues win-back emails for customers who
 * haven't ordered in 90+ days (once per week, guarded by a dedupe key).
 */
async function GETHandler(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};
  const errors: string[] = [];

  // 1. Due queued events.
  const events = await getPendingEmailEvents();
  for (const event of events) {
    try {
      let payload: Record<string, unknown> = {};
      try {
        payload = event.data ? JSON.parse(event.data) : {};
      } catch {
        // ignore malformed payload
      }

      let ok = false;
      switch (event.kind) {
        case "post-purchase":
          ok = await sendPostPurchaseEmail(event.email, {
            orderId: String(payload.orderId ?? ""),
            name: String(payload.name ?? "there"),
            items: Array.isArray(payload.items)
              ? (payload.items as {
                  name: string;
                  price: number;
                  quantity: number;
                  slug?: string;
                }[])
              : [],
            total: Number(payload.total ?? 0),
          });
          break;
        case "abandoned-cart":
          ok = await sendAbandonedCartEmail(event.email, {
            name: String(payload.name ?? ""),
            items: Array.isArray(payload.items)
              ? (payload.items as {
                  name: string;
                  price: number;
                  quantity: number;
                }[])
              : [],
            subtotal: Number(payload.subtotal ?? 0),
          });
          break;
        case "win-back":
          ok = await sendWinbackEmail(event.email, {
            name: String(payload.name ?? ""),
          });
          break;
        default:
          errors.push(`${event.kind}: not handled`);
      }

      if (ok) {
        await markEmailSent(event._id);
        results[event.kind] = (results[event.kind] ?? 0) + 1;
      } else {
        errors.push(`${event.kind} -> ${event.email}: send failed`);
      }
    } catch (err) {
      errors.push(`${event.kind} -> ${event.email}: ${String(err)}`);
    }
  }

  // 2. Win-back sweep: inactive customers via SQL rollups (bounded batch per run).
  const sinceIso = winbackInactiveCutoffIso();
  const candidates = await listWinbackCandidates(sinceIso);
  let winbacksQueued = 0;
  for (const { email, name } of candidates) {
    if (await recentWinbackExists(email, sinceIso)) continue;
    await enqueueEmailEvent("win-back", email, { name }, 0);
    winbacksQueued++;
  }

  return NextResponse.json({
    ok: true,
    sent: results,
    winbacksQueued,
    errors,
    queued: events.length,
  });
}

export const GET = withShopApiObservability("GET /api/flows", GETHandler);
