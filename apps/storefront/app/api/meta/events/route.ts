import { checkoutClientIp } from "@/lib/checkout-guard";
import { readMetaCookieIds } from "@/lib/checkout-tracking-rules";
import { isDemoRequest } from "@/lib/demo";
import { browserMetaCustomData, parseBrowserMetaEvent } from "@/lib/meta-event-rules";
import { canSendMetaServerEvent } from "@/lib/meta-consent";
import { trackMetaServerEvent } from "@/lib/meta-events-api";
import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";

const limiter = createMemoryRateLimiter({ limit: 120, windowMs: 60_000, maxKeys: 8000 });

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 4096) return Response.json({ error: "Invalid event" }, { status: 400 });
  const ip = checkoutClientIp(request);
  if (!limiter.take({ ip })) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Invalid event" }, { status: 400 }); }
  const event = parseBrowserMetaEvent(raw, origin);
  if (!event) return Response.json({ error: "Invalid event" }, { status: 400 });
  if (!canSendMetaServerEvent(event.consent, request.headers) || isDemoRequest(request)) return new Response(null, { status: 204 });
  const { fbp, fbc } = readMetaCookieIds(request.headers.get("cookie") || "");
  await trackMetaServerEvent({
    eventName: event.eventName,
    eventId: event.eventId,
    customData: browserMetaCustomData(event),
    eventSourceUrl: event.pageUrl,
    clientIp: ip === "unknown" ? undefined : ip,
    userAgent: request.headers.get("user-agent") || undefined,
    fbp,
    fbc,
  });
  return new Response(null, { status: 204 });
}
