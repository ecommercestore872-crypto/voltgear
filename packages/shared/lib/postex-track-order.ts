import {
  readPostExJsonResponse,
  resolvePostExTrackOrderUrl,
} from "@/lib/postex";

import type { Order } from "@/lib/types";

export type PostExTrackStatusHistoryEntry = {
  transactionStatusMessage: string | null;
  transactionStatusMessageCode: string | null;
};

export type PostExTrackSafeSuccess = {
  success: true;
  orderId: string;
  trackingNumber: string;
  transactionStatus: string | null;
  orderPickupDate: string | null;
  orderDeliveryDate: string | null;
  transactionDate: string | null;
  transactionStatusHistory: PostExTrackStatusHistoryEntry[];
};

export type PostExTrackOrderHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

type PostExTrackEnv = Pick<NodeJS.ProcessEnv, "POSTEX_API_BASE_URL" | "POSTEX_API_TOKEN">;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function postExStatusOk(statusCode: unknown): boolean {
  return statusCode === "200" || statusCode === 200 || statusCode === "201" || statusCode === 201;
}

export function mapPostExTrackBodyToSafeResponse(
  orderId: string,
  trackingNumber: string,
  data: Record<string, unknown>,
): PostExTrackSafeSuccess | { ok: false; error: string } {
  const dist = asRecord(data.dist);
  if (!dist) {
    return { ok: false, error: "PostEx track response was missing shipment details." };
  }

  const historyRaw = dist.transactionStatusHistory;
  const transactionStatusHistory: PostExTrackStatusHistoryEntry[] = [];
  if (Array.isArray(historyRaw)) {
    for (const item of historyRaw) {
      const row = asRecord(item);
      if (!row) continue;
      transactionStatusHistory.push({
        transactionStatusMessage: asNullableString(row.transactionStatusMessage),
        transactionStatusMessageCode: asNullableString(row.transactionStatusMessageCode),
      });
    }
  }

  return {
    success: true,
    orderId,
    trackingNumber,
    transactionStatus: asNullableString(dist.transactionStatus),
    orderPickupDate: asNullableString(dist.orderPickupDate),
    orderDeliveryDate: asNullableString(dist.orderDeliveryDate),
    transactionDate: asNullableString(dist.transactionDate),
    transactionStatusHistory,
  };
}

export async function fetchPostExTrackOrderFromApi(
  trackingNumber: string,
  options: {
    fetchImpl?: typeof fetch;
    env?: PostExTrackEnv;
  } = {},
): Promise<
  | { ok: true; data: Record<string, unknown>; upstreamHttpStatus: number }
  | { ok: false; error: string; httpStatus: number }
> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) {
    return {
      ok: false,
      error: "PostEx API Token is missing.",
      httpStatus: 503,
    };
  }

  const tn = trackingNumber.trim();
  if (!tn) {
    return { ok: false, error: "Missing tracking number.", httpStatus: 400 };
  }

  const url = resolvePostExTrackOrderUrl(tn, env);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { token },
      cache: "no-store",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to communicate with PostEx API.";
    return { ok: false, error: message, httpStatus: 502 };
  }

  const parsed = await readPostExJsonResponse(res);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      httpStatus: parsed.upstreamHttpStatus >= 400 ? parsed.upstreamHttpStatus : 502,
    };
  }

  const data = parsed.data;
  if (!res.ok || !postExStatusOk(data.statusCode)) {
    const msg =
      asNullableString(data.statusMessage) ||
      asNullableString(data.message) ||
      `PostEx track failed (${parsed.upstreamHttpStatus})`;
    return {
      ok: false,
      error: msg,
      httpStatus: res.ok ? 502 : parsed.upstreamHttpStatus,
    };
  }

  return { ok: true, data, upstreamHttpStatus: parsed.upstreamHttpStatus };
}

export type PostExTrackOrderDeps = {
  getOrder: (orderId: string) => Promise<Order | null>;
  fetchTrack?: typeof fetchPostExTrackOrderFromApi;
};

export async function runPostExTrackOrderForOrderId(
  orderId: string,
  deps: PostExTrackOrderDeps,
): Promise<PostExTrackOrderHttpResult> {
  const trimmedId = orderId?.trim();
  if (!trimmedId) {
    return { status: 400, body: { success: false, error: "Missing orderId." } };
  }

  const order = await deps.getOrder(trimmedId);
  if (!order) {
    return { status: 404, body: { success: false, error: "Order not found." } };
  }

  const trackingNumber = order.postexTrackingNumber?.trim() ?? "";
  if (!trackingNumber) {
    return {
      status: 400,
      body: {
        success: false,
        error: "This order has no PostEx tracking number yet.",
      },
    };
  }

  const fetchTrack = deps.fetchTrack ?? fetchPostExTrackOrderFromApi;
  const tracked = await fetchTrack(trackingNumber);
  if (!tracked.ok) {
    return {
      status: tracked.httpStatus,
      body: {
        success: false,
        error: tracked.error,
        ...(tracked.httpStatus >= 400 ? { upstreamHttpStatus: tracked.httpStatus } : {}),
      },
    };
  }

  const mapped = mapPostExTrackBodyToSafeResponse(trimmedId, trackingNumber, tracked.data);
  if ("ok" in mapped) {
    return { status: 502, body: { success: false, error: mapped.error } };
  }

  return { status: 200, body: { ...mapped } };
}
