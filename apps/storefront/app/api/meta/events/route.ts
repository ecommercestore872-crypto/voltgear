import { checkoutClientIp } from "@/lib/checkout-guard";
import { readMetaCookieIds } from "@/lib/checkout-tracking-rules";
import { trackMetaServerEvent } from "@/lib/meta-events-api";
import { browserMetaCustomData, parseBrowserMetaEvent } from "@/lib/meta-event-rules";
import { canSendMetaServerEvent } from "@/lib/meta-consent";
import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createMemoryRateLimiter({ limit: 120, windowMs: 60_000, maxKeys: 8_000 });

/**
 * Server copy (Meta Conversions API) of a browser pixel event. The browser sends
 * the same eventId it gave the pixel, so Meta counts the pair once. Purchase is
 * deliberately not accepted here: it is sent from the order outbox, never from a
 * browser-supplied request.
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch {}
  const requestHost = request.headers.get("host") || new URL(request.url).host;
  if (!originHost || originHost !== requestHost) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const ip = checkoutClientIp(request);
  if (!limiter.take({ ip })) return new Response(null, { status: 429 });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return new Response(null, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const event = parseBrowserMetaEvent(body, `${new URL(request.url).protocol}//${requestHost}`);
  if (!event) return new Response(null, { status: 400 });
  const noContent = { status: 204, headers: { "Cache-Control": "no-store" } };
  // Honour Global Privacy Control / Do Not Track on this request too.
  if (!canSendMetaServerEvent(event.consent, request.headers)) return new Response(null, noContent);
  const { fbp, fbc, externalId } = readMetaCookieIds(request.headers.get("cookie") ?? "");
  await trackMetaServerEvent({
    eventName: event.eventName, eventId: event.eventId, pageUrl: event.pageUrl,
    customData: browserMetaCustomData(event), consent: event.consent,
    clientIp: ip, userAgent: request.headers.get("user-agent") || undefined,
    fbp, fbc, externalId, emHash: event.em, phHash: event.ph,
  });
  return new Response(null, noContent);
}
