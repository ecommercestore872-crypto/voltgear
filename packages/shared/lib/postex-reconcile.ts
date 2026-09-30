/** Read-only PostEx list-orders lookup for locked booking reconciliation. */

export type PostExReconcileDbState = {
  orderId: string;
  status: string;
  postexTrackingNumber: string | null;
  postexBookingClaimedAt: string | null;
  statusUpdatedAt: string | null;
};

export type PostExReconcileOrderSummary = {
  orderRefNumber: string;
  trackingNumber: string | null;
  transactionStatus: string | null;
  transactionDate: string | null;
  invoicePayment: number | null;
};

export type PostExListOrdersParams = {
  orderStatusID: number;
  fromDate: string;
  toDate: string;
};

export function resolvePostExGetAllOrdersUrl(
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  const base = (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
  return `${base}/services/integration/api/order/v1/get-all-order`;
}

export function buildPostExListOrdersUrl(
  params: PostExListOrdersParams,
  env: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL"> = process.env,
): string {
  const url = new URL(resolvePostExGetAllOrdersUrl(env));
  url.searchParams.set("orderStatusID", String(params.orderStatusID));
  url.searchParams.set("fromDate", params.fromDate);
  url.searchParams.set("toDate", params.toDate);
  return url.toString();
}

function asNullableString(value: unknown): string | null {
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
    statusCode: asNullableString(record.statusCode),
    statusMessage: asNullableString(record.statusMessage),
    message: asNullableString(record.message),
    error: asNullableString(record.error),
  };
}

/** Walk PostEx list payload and collect order-like rows (no customer PII fields mapped). */
export function collectPostExOrderRows(body: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];

  function walk(node: unknown): void {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.orderRefNumber != null || record.trackingNumber != null) {
      out.push(record);
    }
    for (const value of Object.values(record)) walk(value);
  }

  walk(body);
  return out;
}

export function findPostExOrderByRefNumber(
  body: unknown,
  orderRefNumber: string,
): Record<string, unknown> | null {
  const needle = orderRefNumber.trim();
  if (!needle) return null;
  for (const row of collectPostExOrderRows(body)) {
    if (String(row.orderRefNumber ?? "").trim() === needle) return row;
  }
  return null;
}

export function toSafePostExOrderSummary(
  row: Record<string, unknown>,
): PostExReconcileOrderSummary {
  const paymentRaw = row.invoicePayment ?? row.invoiceAmount ?? row.codAmount;
  let invoicePayment: number | null = null;
  if (paymentRaw != null && paymentRaw !== "") {
    const n = Number(paymentRaw);
    invoicePayment = Number.isFinite(n) ? n : null;
  }

  return {
    orderRefNumber: String(row.orderRefNumber ?? "").trim(),
    trackingNumber: asNullableString(
      row.trackingNumber ?? row.orderTrackingNumber ?? row.trackingNo,
    ),
    transactionStatus: asNullableString(row.transactionStatus ?? row.orderStatus),
    transactionDate: asNullableString(
      row.transactionDate ?? row.createdDate ?? row.orderDate,
    ),
    invoicePayment,
  };
}

export function defaultReconcileListDates(dbRow: {
  postex_booking_claimed_at?: string | null;
  created_at?: string | null;
}): { fromDate: string; toDate: string } {
  const iso = dbRow.postex_booking_claimed_at ?? dbRow.created_at;
  const day =
    iso && String(iso).length >= 10
      ? String(iso).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  return { fromDate: day, toDate: day };
}

export function mapReconcileDbState(row: {
  order_id: string;
  status: string;
  postex_tracking_number?: string | null;
  postex_booking_claimed_at?: string | null;
  status_updated_at?: string | null;
}): PostExReconcileDbState {
  return {
    orderId: row.order_id,
    status: row.status,
    postexTrackingNumber: row.postex_tracking_number
      ? String(row.postex_tracking_number)
      : null,
    postexBookingClaimedAt: row.postex_booking_claimed_at
      ? String(row.postex_booking_claimed_at)
      : null,
    statusUpdatedAt: row.status_updated_at ? String(row.status_updated_at) : null,
  };
}

export type PostExListOrdersFetchResult =
  | { ok: true; body: unknown; httpStatus: number; statusCode: string | null; statusMessage: string | null }
  | {
      ok: false;
      error: string;
      httpStatus?: number;
      statusCode?: string | null;
      statusMessage?: string | null;
    };

export async function fetchPostExListOrders(
  params: PostExListOrdersParams,
  options: {
    fetchImpl?: typeof fetch;
    env?: Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL" | "POSTEX_API_TOKEN">;
  } = {},
): Promise<PostExListOrdersFetchResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = env.POSTEX_API_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      error: "POSTEX_API_TOKEN is not configured on the server.",
      httpStatus: 503,
    };
  }

  const url = buildPostExListOrdersUrl(params, env);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { token },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach PostEx API (network error).",
      httpStatus: 502,
    };
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
      statusCode: fields.statusCode,
      statusMessage: fields.statusMessage,
    };
  }

  return {
    ok: true,
    body,
    httpStatus: res.status,
    statusCode: fields.statusCode,
    statusMessage: fields.statusMessage,
  };
}
