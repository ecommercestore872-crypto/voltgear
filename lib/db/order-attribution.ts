import { parseClickAttributionBody } from "@/lib/click-attribution";
import {
  hasOrderAttribution,
  orderAttributionFromClick,
  type OrderAttributionSnapshot,
} from "@/lib/db/order-attribution-rules";
import { updateOrderAttributionRow } from "@/lib/db/store";

const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_id", "ttclid", "fbclid", "gclid"] as const;

function fromSearchParams(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    for (const key of PARAMS) {
      const value = params.get(key);
      if (value) out[key] = value;
    }
  } catch {
    // ignore
  }
  return out;
}

function attributionPayload(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const row = body as Record<string, unknown>;
  return row.attribution ?? body;
}

function attributionFromRequest(request: Request, body: unknown): OrderAttributionSnapshot {
  const merged: Record<string, string> = {};

  const fromBody = parseClickAttributionBody(attributionPayload(body));
  if (fromBody) {
    Object.assign(merged, fromBody);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      Object.assign(merged, fromSearchParams(new URL(referer).search));
    } catch {
      // ignore
    }
  }

  const cookie = request.headers.get("cookie") ?? "";
  const ttclidMatch = cookie.match(/(?:^|;\s*)ttclid=([^;]+)/i);
  if (ttclidMatch?.[1] && !merged.ttclid) {
    merged.ttclid = decodeURIComponent(ttclidMatch[1]);
  }

  return orderAttributionFromClick(merged);
}

export async function attachOrderAttribution(
  orderId: string,
  request: Request,
  body?: unknown,
): Promise<OrderAttributionSnapshot | null> {
  try {
    const snapshot = attributionFromRequest(request, body);
    if (!hasOrderAttribution(snapshot)) {
      return null;
    }
    await updateOrderAttributionRow(orderId, snapshot);
    return snapshot;
  } catch {
    console.error("[order-attribution]", "attach failed");
    return null;
  }
}
