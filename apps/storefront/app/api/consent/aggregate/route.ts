import { parseConsentMetric } from "@/lib/cookie-consent";

export const dynamic = "force-dynamic";

/** Counts choice events in server logs without cookies, identifiers or page URLs. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch {}
  // Next can normalize the URL to localhost behind a proxy; Host keeps the browser-facing host.
  const requestHost = request.headers.get("host") || new URL(request.url).host;
  if (!originHost || originHost !== requestHost) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > 256) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 256) return new Response(null, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const metric = parseConsentMetric(body);
  if (!metric) return new Response(null, { status: 400 });
  console.info(JSON.stringify({ v: 1, kind: "consent_aggregate", ...metric }));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
