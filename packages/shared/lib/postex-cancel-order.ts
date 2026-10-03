import { readPostExJsonResponse, type PostExBaseEnv } from "@/lib/postex";

import type { Order } from "@/lib/types";

export function resolvePostExCancelOrderUrl(
  env: PostExBaseEnv = process.env as PostExBaseEnv,
): string {
  const base = (env.POSTEX_API_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
  return `${base}/services/integration/api/order/v1/cancel-order`;
}

function postExStatusOk(statusCode: unknown): boolean {
  return statusCode === "200" || statusCode === 200 || statusCode === "201" || statusCode === 201;
}

export type PostExCancelOrderHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function cancelPostExShipment(
  trackingNumber: string,
  options: {
    fetchImpl?: typeof fetch;
    env?: PostExBaseEnv;
  } = {},
): Promise<
  | { ok: true; upstreamHttpStatus: number }
  | { ok: false; error: string; httpStatus: number }
> {
  const env = options.env ?? (process.env as PostExBaseEnv);
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) {
    return { ok: false, error: "PostEx API Token is missing.", httpStatus: 503 };
  }

  const tn = trackingNumber.trim();
  if (!tn) {
    return { ok: false, error: "Missing tracking number.", httpStatus: 400 };
  }

  const url = resolvePostExCancelOrderUrl(env);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ trackingNumber: tn }),
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
      (typeof data.statusMessage === "string" && data.statusMessage) ||
      (typeof data.message === "string" && data.message) ||
      `PostEx cancel failed (${parsed.upstreamHttpStatus})`;
    return {
      ok: false,
      error: msg,
      httpStatus: res.ok ? 502 : parsed.upstreamHttpStatus,
    };
  }

  return { ok: true, upstreamHttpStatus: parsed.upstreamHttpStatus };
}

export type PostExCancelOrderDeps = {
  getOrder: (orderId: string) => Promise<Order | null>;
  cancelShipment?: typeof cancelPostExShipment;
};

export async function runPostExCancelOrderForOrderId(
  orderId: string,
  deps: PostExCancelOrderDeps,
): Promise<PostExCancelOrderHttpResult> {
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
        error: "This order has no PostEx tracking number to cancel.",
      },
    };
  }

  const cancelShipment = deps.cancelShipment ?? cancelPostExShipment;
  const cancelled = await cancelShipment(trackingNumber);
  if (!cancelled.ok) {
    return {
      status: cancelled.httpStatus,
      body: {
        success: false,
        error: cancelled.error,
        ...(cancelled.httpStatus >= 400
          ? { upstreamHttpStatus: cancelled.httpStatus }
          : {}),
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      orderId: trimmedId,
      trackingNumber,
      message: "PostEx shipment cancelled successfully.",
    },
  };
}
