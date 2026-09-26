import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/deploy-rules";
import { withShopApiObservability } from "@/lib/shop-api-observability";

import {
  sendAbandonedCartEmail,
  sendPostPurchaseEmail,
  sendWinbackEmail,
} from "@/lib/email";
import {
  enqueueEmailEvent,
  getLightweightOrders,
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

  // 2. Win-back sweep: customers with no order in the last 90 days. Deduped
  //    by checking whether a win-back event was already created recently.
  const orders = await getLightweightOrders();
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(cutoff).toISOString();
  const latestByEmail = new Map<
    string,
    { name?: string; lastOrderAt: number }
  >();
  for (const o of orders) {
    if (!o.customer?.email) continue;
    const at = new Date(o.createdAt).getTime();
    const current = latestByEmail.get(o.customer.email);
    if (!current || at > current.lastOrderAt) {
      latestByEmail.set(o.customer.email, {
        name: o.customer.name,
        lastOrderAt: at,
      });
    }
  }
  let winbacksQueued = 0;
  for (const [email, info] of Array.from(latestByEmail.entries())) {
    if (info.lastOrderAt > cutoff) continue;
    if (await recentWinbackExists(email, sinceIso)) continue;
    await enqueueEmailEvent("win-back", email, { name: info.name ?? "" }, 0);
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
