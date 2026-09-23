import { NextResponse } from "next/server";

import { runAnalyticsCleanup } from "@/lib/db/analytics-cleanup";
import {
  bindProductRelations,
  buildFirstTouch,
  createMemoryRateLimiter,
  deviceTypeFromUserAgent,
  ingestLogFields,
  isAllowedAnalyticsOrigin,
  isAnalyticsUuid,
  isUniqueViolation,
  normalizePathname,
  parseIngestBody,
  rateLimitIdentity,
  readCookieValue,
} from "@/lib/db/analytics-ingest-rules";
import {
  SESSION_IDLE_MS,
  resolveAnalyticsSession,
  shouldApplyFirstTouch,
} from "@/lib/db/analytics-session-rules";
import { isDemoRequest } from "@/lib/demo";
import { shouldCollectPath } from "@/lib/first-party-analytics";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "vg_vid";
const SESSION_COOKIE = "vg_sid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_MAX_AGE = Math.floor(SESSION_IDLE_MS / 1000);

const rateLimiter = createMemoryRateLimiter({
  limit: 60,
  windowMs: 60_000,
  maxKeys: 5000,
});

function okResponse() {
  return NextResponse.json({ ok: true });
}

function analyticsCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

function logIngest(reason: string, body: unknown) {
  const raw =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  console.info(
    "[analytics-ingest]",
    ingestLogFields({
      reason,
      name: typeof raw.name === "string" ? raw.name : undefined,
      path: typeof raw.path === "string" ? raw.path : undefined,
    }),
  );
}

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return okResponse();
  }

  const host = request.headers.get("host") ?? "";
  if (!isAllowedAnalyticsOrigin(request.headers.get("origin"), host)) {
    logIngest("origin", body);
    return okResponse();
  }

  const rawPath =
    typeof asRecord(body).path === "string" ? String(asRecord(body).path) : "/";
  if (!shouldCollectPath(normalizePathname(rawPath))) {
    return okResponse();
  }

  const cookieHeader = request.headers.get("cookie");
  const sidCookie = readCookieValue(cookieHeader, SESSION_COOKIE);
  if (
    !rateLimiter.take(
      rateLimitIdentity({
        forwardedFor: request.headers.get("x-forwarded-for"),
        sessionCookie: sidCookie,
      }),
    )
  ) {
    return okResponse();
  }

  const parsed = parseIngestBody(body);
  if (!parsed.ok) {
    logIngest("parse", body);
    return okResponse();
  }
  const event = parsed.event;

  try {
    const db = getServiceClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const vidCookie = readCookieValue(cookieHeader, VISITOR_COOKIE);
    const cookieVisitorId =
      vidCookie && isAnalyticsUuid(vidCookie) ? vidCookie : null;
    const cookieSessionId =
      sidCookie && isAnalyticsUuid(sidCookie) ? sidCookie : null;

    let existingSession: {
      id: string;
      visitorId: string;
      lastActivityAt: string;
      isDemo: boolean;
    } | null = null;

    if (cookieSessionId) {
      const { data, error } = await db
        .from("analytics_sessions")
        .select("id, visitor_id, last_activity_at, is_demo")
        .eq("id", cookieSessionId)
        .maybeSingle();
      if (error) {
        return okResponse();
      }
      if (data) {
        existingSession = {
          id: String(data.id),
          visitorId: String(data.visitor_id),
          lastActivityAt: String(data.last_activity_at),
          isDemo: Boolean(data.is_demo),
        };
      }
    }

    const resolved = resolveAnalyticsSession({
      now,
      cookieVisitorId,
      cookieSessionId,
      demoCookie: isDemoRequest(request),
      existingSession,
      existingVisitorId: existingSession?.visitorId ?? null,
    });

    const { data: visitorRow, error: visitorLookupError } = await db
      .from("analytics_visitors")
      .select("id")
      .eq("id", resolved.visitorId)
      .maybeSingle();
    if (visitorLookupError) {
      return okResponse();
    }
    if (!visitorRow) {
      const { error: visitorInsertError } = await db
        .from("analytics_visitors")
        .insert({
          id: resolved.visitorId,
          first_seen_at: nowIso,
          last_seen_at: nowIso,
        });
      if (visitorInsertError && !isUniqueViolation(visitorInsertError.code)) {
        return okResponse();
      }
    } else {
      const { error: visitorUpdateError } = await db
        .from("analytics_visitors")
        .update({ last_seen_at: nowIso })
        .eq("id", resolved.visitorId);
      if (visitorUpdateError) {
        return okResponse();
      }
    }

    if (resolved.isNewSession) {
      const shopHost = host.split(":")[0] || host;
      const touch = shouldApplyFirstTouch(resolved.isNewSession)
        ? buildFirstTouch(asRecord(body).attribution, event.path, shopHost)
        : buildFirstTouch({}, event.path, shopHost);
      const { error: sessionInsertError } = await db
        .from("analytics_sessions")
        .insert({
          id: resolved.sessionId,
          visitor_id: resolved.visitorId,
          started_at: nowIso,
          last_activity_at: nowIso,
          is_demo: resolved.isDemo,
          landing_path: touch.landing_path,
          referrer: touch.referrer,
          source: touch.source,
          medium: touch.medium,
          campaign: touch.campaign,
          campaign_id: touch.campaign_id,
          campaign_content: touch.campaign_content,
          campaign_term: touch.campaign_term,
          ttclid: touch.ttclid,
          fbclid: touch.fbclid,
          gclid: touch.gclid,
          device_type: deviceTypeFromUserAgent(
            request.headers.get("user-agent"),
          ),
        });
      if (sessionInsertError && !isUniqueViolation(sessionInsertError.code)) {
        return okResponse();
      }
    } else {
      const { error: sessionUpdateError } = await db
        .from("analytics_sessions")
        .update({ last_activity_at: nowIso })
        .eq("id", resolved.sessionId);
      if (sessionUpdateError) {
        return okResponse();
      }
    }

    let productExists = false;
    if (event.product_id) {
      const { data: product } = await db
        .from("products")
        .select("id")
        .eq("id", event.product_id)
        .maybeSingle();
      productExists = Boolean(product);
    }

    let variantProductId: string | null = null;
    if (event.variant_id) {
      const { data: variant } = await db
        .from("product_variants")
        .select("id, product_id")
        .eq("id", event.variant_id)
        .maybeSingle();
      variantProductId = variant?.product_id
        ? String(variant.product_id)
        : null;
    }

    const refs = bindProductRelations({
      productId: event.product_id,
      variantId: event.variant_id,
      productExists,
      variantProductId,
    });

    const { error: eventError } = await db.from("analytics_events").insert({
      event_id: event.event_id,
      session_id: resolved.sessionId,
      visitor_id: resolved.visitorId,
      is_demo: resolved.isDemo,
      name: event.name,
      occurred_at: nowIso,
      path: event.path,
      page_type: event.page_type,
      product_id: refs.product_id,
      variant_id: refs.variant_id,
      product_slug: event.product_slug ?? null,
      properties: event.properties,
    });
    if (eventError && !isUniqueViolation(eventError.code)) {
      return okResponse();
    }

    const res = okResponse();
    res.cookies.set(
      VISITOR_COOKIE,
      resolved.visitorId,
      analyticsCookieOptions(VISITOR_MAX_AGE),
    );
    res.cookies.set(
      SESSION_COOKIE,
      resolved.sessionId,
      analyticsCookieOptions(SESSION_MAX_AGE),
    );

    if (Math.random() < 1 / 50) {
      try {
        await runAnalyticsCleanup(now);
      } catch {
        // fail-open: cleanup must not drop Set-Cookie
      }
    }

    return res;
  } catch {
    return okResponse();
  }
}
