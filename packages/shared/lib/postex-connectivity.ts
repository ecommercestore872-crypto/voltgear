/** Server-only PostEx API connectivity probe (no order/checkout side effects). */

export type PostExConnectivitySafeResponse = {
  success: boolean;
  statusCode: string | null;
  statusMessage: string | null;
  operationalCityCount: number;
  error?: string;
};

type PostExConnectivityInternal = PostExConnectivitySafeResponse & {
  httpStatus?: number;
};

export function resolvePostExOperationalCityUrl(
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  const base = (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
  return `${base}/services/integration/api/order/v2/get-operational-city?operationalCityType=Delivery`;
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

/** Count city rows without returning raw PostEx payload to callers. */
export function countOperationalCitiesFromPostExBody(body: unknown): number {
  if (!body || typeof body !== "object") return 0;
  const record = body as Record<string, unknown>;
  const buckets = [record.dist, record.data, record.operationalCities, record.cities];
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) return bucket.length;
  }
  return 0;
}

function safeApiFailure(message: string, httpStatus?: number): PostExConnectivityInternal {
  return {
    success: false,
    statusCode: null,
    statusMessage: null,
    operationalCityCount: 0,
    error: message,
    httpStatus,
  };
}

/**
 * Calls PostEx get-operational-city (Delivery). Never returns or logs the API token.
 */
export async function runPostExConnectivityTest(): Promise<PostExConnectivityInternal> {
  const token = readPostExToken();
  if (!token) {
    return safeApiFailure(
      "POSTEX_API_TOKEN is not configured on the server.",
      503,
    );
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
    return safeApiFailure("Could not reach PostEx API (network error).", 502);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return safeApiFailure("PostEx returned a non-JSON response.", res.ok ? 502 : res.status);
  }

  const statusCode =
    body && typeof body === "object"
      ? asNonEmptyString((body as Record<string, unknown>).statusCode)
      : null;
  const statusMessage =
    body && typeof body === "object"
      ? asNonEmptyString((body as Record<string, unknown>).statusMessage)
      : null;

  const operationalCityCount = countOperationalCitiesFromPostExBody(body);
  const postexOk = statusCode === "200" || statusCode === "201";

  if (!res.ok || !postexOk) {
    return {
      success: false,
      statusCode,
      statusMessage,
      operationalCityCount,
      error: statusMessage || `PostEx HTTP ${res.status}`,
      httpStatus: res.ok ? 502 : res.status,
    };
  }

  return {
    success: true,
    statusCode,
    statusMessage,
    operationalCityCount,
  };
}
