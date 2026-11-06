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
  transactionNotes?: string;
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
  /** Definitive means the request was rejected or never sent. Unknown requires reconciliation. */
  failureKind?: "definitive" | "unknown";
  upstreamHttpStatus?: number;
};

export type PostExCreateOrderSuccess = {
  ok: true;
  trackingNumber: string;
  data: unknown;
};

export type PostExCreateOrderResult = PostExCreateOrderSuccess | PostExCreateOrderFailure;

const POSTEX_INTEGRATION_API_SUFFIX = "/services/integration/api";

export type PostExBaseEnv = {
  POSTEX_API_BASE_URL?: string;
  POSTEX_API_TOKEN?: string;
  POSTEX_PICKUP_ADDRESS_CODE?: string;
  NEXT_PUBLIC_POSTEX_PICKUP_ADDRESS_CODE?: string;
};

const postExEnv = (): PostExBaseEnv => process.env as PostExBaseEnv;

function resolvePostExHostBase(env: PostExBaseEnv = postExEnv()): string {
  const configured = (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(
    /\/+$/,
    "",
  );
  return configured.endsWith(POSTEX_INTEGRATION_API_SUFFIX)
    ? configured.slice(0, -POSTEX_INTEGRATION_API_SUFFIX.length)
    : configured;
}

export function resolvePostExIntegrationBaseUrl(
  env: PostExBaseEnv = postExEnv(),
): string {
  return `${resolvePostExHostBase(env)}${POSTEX_INTEGRATION_API_SUFFIX}`;
}

/** PostEx create-order URL (host base + integration path). */
export function resolvePostExCreateOrderUrl(env: PostExBaseEnv = postExEnv()): string {
  return `${resolvePostExIntegrationBaseUrl(env)}/order/v3/create-order`;
}

/** PostEx track-order URL (host base + integration path). */
export function resolvePostExTrackOrderUrl(
  trackingNumber: string,
  env: PostExBaseEnv = postExEnv(),
): string {
  const tn = encodeURIComponent(trackingNumber.trim());
  return `${resolvePostExIntegrationBaseUrl(env)}/order/v1/track-order/${tn}`;
}

/** PostEx get-invoice / airway bill URL (host base + integration path). */
export function resolvePostExGetInvoiceUrl(
  trackingNumbers: string | string[],
  env: PostExBaseEnv = postExEnv(),
): string {
  const list = (Array.isArray(trackingNumbers) ? trackingNumbers : [trackingNumbers])
    .map((t) => t.trim())
    .filter(Boolean);
  const url = new URL(
    `${resolvePostExIntegrationBaseUrl(env)}/order/v1/get-invoice`,
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

function validCreateOrderPayload(payload: PostExOrderPayload, pickupAddressCode: string): boolean {
  return Boolean(
    /^[A-Za-z0-9_-]{1,80}$/.test(payload.orderRefNumber?.trim() ?? "") &&
    Number.isSafeInteger(payload.invoicePayment) && payload.invoicePayment > 0 &&
    payload.customerName?.trim() &&
    /^03\d{9}$/.test(payload.customerPhone?.trim() ?? "") &&
    (payload.deliveryAddress?.trim().length ?? 0) >= 5 &&
    payload.cityName?.trim() && pickupAddressCode &&
    payload.orderDetail?.trim() &&
    Number.isSafeInteger(payload.items) && (payload.items ?? 0) > 0 &&
    (payload.invoiceDivision == null ||
      (Number.isSafeInteger(payload.invoiceDivision) && payload.invoiceDivision > 0))
  );
}

/**
 * Creates an order shipment in PostEx system.
 */
export async function createPostExOrder(
  payload: PostExOrderPayload,
  options: {
    fetchImpl?: typeof fetch;
    env?: PostExBaseEnv;
  } = {},
): Promise<PostExCreateOrderResult> {
  const env = options.env ?? postExEnv();
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) {
    return {
      ok: false,
      error: "PostEx API Token is missing. Set POSTEX_API_TOKEN in environment variables.",
      failureKind: "definitive",
    };
  }

  const pickupAddressCode =
    payload.pickupAddressCode?.trim() || env.POSTEX_PICKUP_ADDRESS_CODE?.trim() || "";
  if (!validCreateOrderPayload(payload, pickupAddressCode)) {
    return { ok: false, error: "PostEx booking data is incomplete or invalid.", failureKind: "definitive" };
  }

  const body: Record<string, unknown> = {
    orderRefNumber: payload.orderRefNumber,
    invoicePayment: payload.invoicePayment,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    deliveryAddress: payload.deliveryAddress,
    cityName: payload.cityName.trim(),
    pickupAddressCode: pickupAddressCode,
    orderDetail: payload.orderDetail!.trim(),
    invoiceDivision: payload.invoiceDivision ?? 1,
    items: payload.items,
    orderType: "Normal",
  };
  const notes = payload.transactionNotes?.trim();
  if (notes) body.transactionNotes = notes;

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
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return {
      ok: false,
      error: "PostEx booking outcome is unknown; reconcile before retrying.",
      failureKind: "unknown",
    };
  }

  const parsed = await readPostExJsonResponse(res);
  if (!parsed.ok) {
    return { ...parsed, failureKind: "unknown" };
  }

  const data = parsed.data;
  const upstreamHttpStatus = parsed.upstreamHttpStatus;

  if (!res.ok || !postExStatusOk(data.statusCode)) {
    return {
      ok: false,
      // Without a merchant idempotency/rejection contract, any response after
      // sending the create request may represent a shipment that needs lookup.
      error: "PostEx booking outcome is unknown; reconcile before retrying.",
      failureKind: "unknown",
      upstreamHttpStatus,
    };
  }

  const trackingNumber = extractTrackingNumber(data);
  if (!trackingNumber) {
    return {
      ok: false,
      error: "PostEx booking succeeded but tracking number was missing in response.",
      failureKind: "unknown",
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
  trackingNumber: string,
  options: { fetchImpl?: typeof fetch; env?: PostExBaseEnv } = {},
): Promise<{ ok: true; rawStatus: string; data: unknown } | { ok: false; error: string }> {
  const env = options.env ?? postExEnv();
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) return { ok: false, error: "PostEx API Token is missing." };
  const tn = trackingNumber.trim();
  if (!tn) return { ok: false, error: "Missing tracking number." };
  try {
    const res = await (options.fetchImpl ?? fetch)(resolvePostExTrackOrderUrl(tn, env), {
      method: "GET",
      headers: { token },
    });
    const parsed = await readPostExJsonResponse(res);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const data = parsed.data;
    if (!res.ok) return { ok: false, error: `PostEx track failed (${res.status})` };
    return { ok: true, rawStatus: JSON.stringify(data ?? {}), data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PostEx track request failed.";
    return { ok: false, error: message };
  }
}

export async function getPostExInvoice(
  trackingNumbers: string[],
  options: { fetchImpl?: typeof fetch; env?: PostExBaseEnv } = {},
): Promise<{ ok: true; pdfBase64: string } | { ok: false; error: string }> {
  const env = options.env ?? postExEnv();
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) return { ok: false, error: "PostEx API Token missing." };

  try {
    const res = await (options.fetchImpl ?? fetch)(
      resolvePostExGetInvoiceUrl(trackingNumbers, env),
      {
        method: "GET",
        headers: { token },
      },
    );
    const parsed = await readPostExJsonResponse(res);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const data = parsed.data;
    if (!res.ok || (data.statusCode != null && !postExStatusOk(data.statusCode))) {
      return {
        ok: false,
        error:
          (typeof data.statusMessage === "string" && data.statusMessage) ||
          "Failed to fetch PostEx invoice.",
      };
    }

    const pdf = data.dist ?? data.invoice ?? "";
    return { ok: true, pdfBase64: typeof pdf === "string" ? pdf : "" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PostEx invoice request failed.";
    return { ok: false, error: message };
  }
}
