import {
  readPostExJsonResponse,
  resolvePostExIntegrationBaseUrl,
  type PostExBaseEnv,
} from "@/lib/postex";

import type { Order } from "@/lib/types";

export function resolvePostExCancelOrderUrl(
  env: PostExBaseEnv = process.env as PostExBaseEnv,
): string {
  return `${resolvePostExIntegrationBaseUrl(env)}/order/v1/cancel-order`;
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
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return { ok: false, error: "PostEx cancellation outcome is unknown; reconcile before retrying.", httpStatus: 502 };
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
  claimCancellation?: (orderId: string, trackingNumber: string) => Promise<string | null>;
  markUnknown?: (orderId: string, attemptId: string) => Promise<boolean>;
  markConfirmed?: (orderId: string, trackingNumber: string, attemptId: string) => Promise<boolean>;
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

  if (order.status === "shipped" || order.status === "delivered") {
    return {
      status: 409,
      body: { success: false, error: "Shipment has progressed beyond booking; review its PostEx status before cancellation." },
    };
  }

  const attemptId = deps.claimCancellation ? await deps.claimCancellation(trimmedId, trackingNumber) : null;
  if (deps.claimCancellation && !attemptId) {
    return { status: 409, body: { success: false, error: "PostEx cancellation is already in progress or requires reconciliation." } };
  }

  const cancelShipment = deps.cancelShipment ?? cancelPostExShipment;
  let cancelled: Awaited<ReturnType<typeof cancelPostExShipment>>;
  try {
    cancelled = await cancelShipment(trackingNumber);
  } catch {
    cancelled = { ok: false, error: "PostEx cancellation outcome is unknown; reconcile before retrying.", httpStatus: 502 };
  }
  if (!cancelled.ok) {
    if (attemptId && deps.markUnknown) await deps.markUnknown(trimmedId, attemptId);
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

  if (attemptId && deps.markConfirmed && !await deps.markConfirmed(trimmedId, trackingNumber, attemptId)) {
    return { status: 503, body: { success: false, error: "PostEx confirmed cancellation, but local confirmation failed. Reconcile before retrying." } };
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
