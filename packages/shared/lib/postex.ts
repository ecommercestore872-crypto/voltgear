export type PostExOrderPayload = {
  orderRefNumber: string;
  invoicePayment: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cityName: string;
  pickupAddressCode?: string;
  orderDetail?: string;
  invoiceDivision?: number;
  items?: number;
};

export type PostExBookingResponse = {
  statusCode: string;
  statusMessage: string;
  dist: {
    trackingNumber: string;
    orderRefNumber: string;
    invoicePayment: number;
    transactionStatus: string;
  };
};

export type PostExCreateOrderFailure = {
  ok: false;
  error: string;
  upstreamHttpStatus?: number;
};

export type PostExCreateOrderSuccess = {
  ok: true;
  trackingNumber: string;
  data: unknown;
};

export type PostExCreateOrderResult = PostExCreateOrderSuccess | PostExCreateOrderFailure;

const POSTEX_INTEGRATION_API_SUFFIX = "/services/integration/api";

const POSTEX_BASE_URL =
  process.env.POSTEX_API_BASE_URL || "https://api.postex.pk/services/integration/api";

function resolvePostExHostBase(
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  return (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
}

/** PostEx create-order URL (host base + integration path). */
export function resolvePostExCreateOrderUrl(
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  return `${resolvePostExHostBase(env)}${POSTEX_INTEGRATION_API_SUFFIX}/order/v3/create-order`;
}

/** PostEx track-order URL (host base + integration path). */
export function resolvePostExTrackOrderUrl(
  trackingNumber: string,
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  const tn = encodeURIComponent(trackingNumber.trim());
  return `${resolvePostExHostBase(env)}${POSTEX_INTEGRATION_API_SUFFIX}/order/v1/track-order/${tn}`;
}

/** PostEx get-invoice / airway bill URL (host base + integration path). */
export function resolvePostExGetInvoiceUrl(
  trackingNumbers: string | string[],
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  const list = (Array.isArray(trackingNumbers) ? trackingNumbers : [trackingNumbers])
    .map((t) => t.trim())
    .filter(Boolean);
  const url = new URL(
    `${resolvePostExHostBase(env)}${POSTEX_INTEGRATION_API_SUFFIX}/order/v1/get-invoice`,
  );
  url.searchParams.set("trackingNumbers", list.join(","));
  return url.toString();
}

function getPostExToken(): string {
  const token = process.env.POSTEX_API_TOKEN;
  return token ? token.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function postExStatusOk(statusCode: unknown): boolean {
  return statusCode === "200" || statusCode === 200 || statusCode === "201" || statusCode === 201;
}

/** Safe JSON body read — never throws on HTML/plain text. */
export async function readPostExJsonResponse(
  res: Response,
): Promise<
  | { ok: true; data: Record<string, unknown>; upstreamHttpStatus: number }
  | { ok: false; error: string; upstreamHttpStatus: number }
> {
  const upstreamHttpStatus = res.status;
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  let text: string;
  try {
    text = await res.text();
  } catch {
    return {
      ok: false,
      error: "Failed to communicate with PostEx API.",
      upstreamHttpStatus,
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "PostEx returned an empty response.",
      upstreamHttpStatus,
    };
  }

  const looksJson =
    contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksJson) {
    return {
      ok: false,
      error: "PostEx returned a non-JSON response",
      upstreamHttpStatus,
    };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    const data = asRecord(parsed);
    if (!data) {
      return {
        ok: false,
        error: "PostEx returned a non-JSON response",
        upstreamHttpStatus,
      };
    }
    return { ok: true, data, upstreamHttpStatus };
  } catch {
    return {
      ok: false,
      error: "PostEx returned a non-JSON response",
      upstreamHttpStatus,
    };
  }
}

function extractTrackingNumber(data: Record<string, unknown>): string | null {
  const dist = asRecord(data.dist);
  const fromDist = dist?.trackingNumber ?? dist?.orderTrackingNumber;
  const top = data.trackingNumber;
  const candidate = fromDist ?? top;
  if (candidate == null) return null;
  const s = String(candidate).trim();
  return s.length ? s : null;
}

/**
 * Creates an order shipment in PostEx system.
 */
export async function createPostExOrder(
  payload: PostExOrderPayload,
  options: {
    fetchImpl?: typeof fetch;
    env?: Pick<
      NodeJS.ProcessEnv,
      "POSTEX_API_TOKEN" | "POSTEX_API_BASE_URL" | "POSTEX_PICKUP_ADDRESS_CODE" | "NEXT_PUBLIC_POSTEX_PICKUP_ADDRESS_CODE"
    >;
  } = {},
): Promise<PostExCreateOrderResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) {
    return {
      ok: false,
      error: "PostEx API Token is missing. Set POSTEX_API_TOKEN in environment variables.",
    };
  }

  const pickupAddressCode =
    payload.pickupAddressCode ||
    env.POSTEX_PICKUP_ADDRESS_CODE?.trim() ||
    env.NEXT_PUBLIC_POSTEX_PICKUP_ADDRESS_CODE?.trim() ||
    "001";

  const body = {
    orderRefNumber: payload.orderRefNumber,
    invoicePayment: payload.invoicePayment,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    deliveryAddress: payload.deliveryAddress,
    cityName: payload.cityName || "Lahore",
    pickupAddressCode: pickupAddressCode,
    orderDetail: payload.orderDetail || "Electronics Accessories",
    invoiceDivision: payload.invoiceDivision || 1,
    items: payload.items || 1,
    orderType: "Normal",
  };

  const url = resolvePostExCreateOrderUrl(env);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    console.error(
      "[PostEx API Error]:",
      err instanceof Error ? err.message : "network error",
    );
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to communicate with PostEx API.",
    };
  }

  const parsed = await readPostExJsonResponse(res);
  if (!parsed.ok) {
    console.error("[PostEx API Error]:", parsed.error, `(HTTP ${parsed.upstreamHttpStatus})`);
    return parsed;
  }

  const data = parsed.data;
  const upstreamHttpStatus = parsed.upstreamHttpStatus;

  if (!res.ok || !postExStatusOk(data.statusCode)) {
    const msg =
      (typeof data.statusMessage === "string" && data.statusMessage) ||
      (typeof data.message === "string" && data.message) ||
      `PostEx error (${upstreamHttpStatus})`;
    return { ok: false, error: msg, upstreamHttpStatus };
  }

  const trackingNumber = extractTrackingNumber(data);
  if (!trackingNumber) {
    return {
      ok: false,
      error: "PostEx booking succeeded but tracking number was missing in response.",
      upstreamHttpStatus,
    };
  }

  return { ok: true, trackingNumber, data };
}

/**
 * Fetches PDF invoice / airway bill base64 string from PostEx for tracking number(s).
 */
export function postExConfigured(): boolean {
  return Boolean(getPostExToken());
}

/** Official path: GET /v1/track-order/{trackingNumber} with `token` header. */
export async function trackPostExOrder(
  trackingNumber: string
): Promise<{ ok: true; rawStatus: string; data: unknown } | { ok: false; error: string }> {
  const token = getPostExToken();
  if (!token) return { ok: false, error: "PostEx API Token is missing." };
  const tn = trackingNumber.trim();
  if (!tn) return { ok: false, error: "Missing tracking number." };
  try {
    const res = await fetch(`${POSTEX_BASE_URL}/v1/track-order/${encodeURIComponent(tn)}`, {
      method: "GET",
      headers: { token },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: `PostEx track failed (${res.status})` };
    }
    return { ok: true, rawStatus: JSON.stringify(data ?? {}), data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PostEx track request failed.";
    return { ok: false, error: message };
  }
}

export async function getPostExInvoice(
  trackingNumbers: string[]
): Promise<{ ok: true; pdfBase64: string } | { ok: false; error: string }> {
  const token = getPostExToken();
  if (!token) return { ok: false, error: "PostEx API Token missing." };

  try {
    const res = await fetch(
      `${POSTEX_BASE_URL}/v1/get-invoice?trackingNumbers=${trackingNumbers.join(",")}`,
      {
        method: "GET",
        headers: { token: token },
      }
    );
    const data = await res.json();
    if (!res.ok || (data.statusCode && data.statusCode !== "200")) {
      return { ok: false, error: data.statusMessage || "Failed to fetch PostEx invoice." };
    }

    return { ok: true, pdfBase64: data.dist || data.invoice || "" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PostEx invoice request failed.";
    return { ok: false, error: message };
  }
}
