import type { PostExBaseEnv } from "@/lib/postex";

/** Server-only PostEx API connectivity probe (no order/checkout side effects). */

export type PostExConnectivitySafeResponse = {
  success: boolean;
  statusCode: string | null;
  statusMessage: string | null;
  operationalCityCount: number;
  upstreamHttpStatus?: number;
  error?: string;
  message?: string;
};

type PostExConnectivityInternal = PostExConnectivitySafeResponse & {
  httpStatus?: number;
};

export function resolvePostExOperationalCityUrl(
  env: PostExBaseEnv = process.env as PostExBaseEnv,
): string {
  const base = (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
  return `${base}/services/integration/api/order/v2/get-operational-city`;
}

function readPostExToken(): string {
  const token = process.env.POSTEX_API_TOKEN;
  return token ? token.trim() : "";
}

function asNonEmptyString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function parsePostExBodyFields(body: unknown): {
  statusCode: string | null;
  statusMessage: string | null;
  message: string | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { statusCode: null, statusMessage: null, message: null, error: null };
  }
  const record = body as Record<string, unknown>;
  return {
    statusCode: asNonEmptyString(record.statusCode),
    statusMessage: asNonEmptyString(record.statusMessage),
    message: asNonEmptyString(record.message),
    error: asNonEmptyString(record.error),
  };
}

/** Count city rows without returning raw PostEx payload to callers. */
export function countOperationalCitiesFromPostExBody(body: unknown): number {
  return extractOperationalCityNamesFromPostExBody(body).length;
}

/** Canonical PostEx operational city names from get-operational-city response. */
export function extractOperationalCityNamesFromPostExBody(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const buckets = [record.dist, record.data, record.operationalCities, record.cities];
  const names: string[] = [];
  const seen = new Set<string>();

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const row of bucket) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = asNonEmptyString(
        r.operationalCityName ??
          r.cityName ??
          r.operationalCity ??
          r.city ??
          r.name,
      );
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
  }

  return names;
}

type PostExOperationalCityFetchResult =
  | { ok: true; body: unknown; statusCode: string | null; statusMessage: string | null }
  | { ok: false; error: string; httpStatus?: number };

async function fetchPostExOperationalCityBody(): Promise<PostExOperationalCityFetchResult> {
  const token = readPostExToken();
  if (!token) {
    return {
      ok: false,
      error: "POSTEX_API_TOKEN is not configured on the server.",
      httpStatus: 503,
    };
  }

  const url = resolvePostExOperationalCityUrl();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { token },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach PostEx API (network error).", httpStatus: 502 };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: "PostEx returned a non-JSON response.",
      httpStatus: res.ok ? 502 : res.status,
    };
  }

  const fields = parsePostExBodyFields(body);
  const postexOk = fields.statusCode === "200" || fields.statusCode === "201";
  if (!res.ok || !postexOk) {
    const fallback = `PostEx HTTP ${res.status}`;
    return {
      ok: false,
      error: fields.error || fields.statusMessage || fields.message || fallback,
      httpStatus: res.ok ? 502 : res.status,
    };
  }

  return {
    ok: true,
    body,
    statusCode: fields.statusCode,
    statusMessage: fields.statusMessage,
  };
}

export async function fetchPostExOperationalCityNames(): Promise<
  | { ok: true; cities: string[] }
  | { ok: false; error: string; httpStatus?: number }
> {
  const fetched = await fetchPostExOperationalCityBody();
  if (!fetched.ok) return fetched;

  const cities = extractOperationalCityNamesFromPostExBody(fetched.body);
  if (!cities.length) {
    return {
      ok: false,
      error: "PostEx returned no operational cities.",
      httpStatus: 502,
    };
  }

  return { ok: true, cities };
}

function safeApiFailure(message: string, httpStatus?: number): PostExConnectivityInternal {
  return {
    success: false,
    statusCode: null,
    statusMessage: null,
    operationalCityCount: 0,
    upstreamHttpStatus: httpStatus,
    error: message,
    httpStatus,
  };
}

/**
 * Calls PostEx get-operational-city (diagnostic, no query params). Never returns or logs the API token.
 */
export async function runPostExConnectivityTest(): Promise<PostExConnectivityInternal> {
  const fetched = await fetchPostExOperationalCityBody();
  if (!fetched.ok) {
    return safeApiFailure(fetched.error, fetched.httpStatus);
  }

  const operationalCityCount = extractOperationalCityNamesFromPostExBody(fetched.body).length;

  return {
    success: true,
    statusCode: fetched.statusCode,
    statusMessage: fetched.statusMessage,
    operationalCityCount,
  };
}
